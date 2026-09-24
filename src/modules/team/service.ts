import { and, eq, gt } from "drizzle-orm";
import { companyHome } from "@/modules/auth/redirects";
import { db } from "@/db";
import { companies, companyInvitations, companyMembers, users } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { secureToken } from "@/lib/ids";
import { absoluteUrl } from "@/lib/utils";
import { audit } from "@/modules/audit/log";
import { sha256 } from "@/modules/auth/session";
import { emailLayout, sendEmail } from "@/modules/notifications/email";
import { notifyUser } from "@/modules/notifications/service";
import type { InviteMemberInput } from "./schemas";

const INVITE_TTL_DAYS = 14;

/** Create (or refresh) an invitation and email the recipient a signed link. */
export async function inviteMember(companyId: string, inviterId: string, input: InviteMemberInput, locale = "en") {
  const [company] = await db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) throw new ActionError("Company not found.", "NOT_FOUND");

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existingUser) {
    const [member] = await db
      .select({ id: companyMembers.id, status: companyMembers.status })
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, existingUser.id)))
      .limit(1);
    if (member && member.status === "ACTIVE") throw new ActionError("That person is already on your team.", "DUPLICATE");
  }

  // Revoke any still-pending invitation for the same address before issuing a new one.
  await db
    .update(companyInvitations)
    .set({ status: "REVOKED" })
    .where(and(eq(companyInvitations.companyId, companyId), eq(companyInvitations.email, input.email), eq(companyInvitations.status, "PENDING")));

  const token = secureToken(24);
  const [invitation] = await db
    .insert(companyInvitations)
    .values({
      companyId,
      email: input.email,
      role: input.role,
      tokenHash: sha256(token),
      invitedById: inviterId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400000),
    })
    .returning();

  const url = absoluteUrl(`/${locale}/invite/${token}`);
  await sendEmail({
    to: input.email,
    subject: `[CANG] You have been invited to join ${company.name}`,
    html: emailLayout(
      `Join ${company.name} on CANG`,
      `<p>You were invited to join <strong>${escapeHtml(company.name)}</strong> on CANG as <strong>${input.role.toLowerCase()}</strong>.</p><p>This invitation expires in ${INVITE_TTL_DAYS} days.</p>`,
      { label: "Accept the invitation", url },
    ),
  }).catch((e) => console.error("[team] invite email failed", e));

  if (existingUser) {
    await notifyUser(existingUser.id, {
      type: "TEAM_INVITATION",
      title: `You were invited to join ${company.name}`,
      body: `Role: ${input.role.toLowerCase()}`,
      link: `/invite/${token}`,
      email: false,
    });
  }
  await audit({ actorId: inviterId, action: "company.member.invite", entityType: "company", entityId: companyId, after: { email: input.email, role: input.role } });
  return { invitation, url };
}

/** Look up a pending invitation by its raw token. */
export async function findInvitationByToken(token: string) {
  const row = await db.query.companyInvitations.findFirst({
    where: and(eq(companyInvitations.tokenHash, sha256(token)), eq(companyInvitations.status, "PENDING"), gt(companyInvitations.expiresAt, new Date())),
    with: { company: { columns: { id: true, name: true, slug: true, logoUrl: true, isBuyer: true, isSeller: true, isLogisticsPartner: true } }, invitedBy: { columns: { id: true, name: true } } },
  });
  return row ?? null;
}

/** Accept an invitation for the signed-in user (email must match). */
export async function acceptInvitation(token: string, userId: string, userEmail: string) {
  const invitation = await findInvitationByToken(token);
  if (!invitation) throw new ActionError("This invitation is invalid or has expired.", "NOT_FOUND");
  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new ActionError(`This invitation was sent to ${invitation.email}. Sign in with that email address to accept it.`, "FORBIDDEN");
  }
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: companyMembers.id })
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, invitation.companyId), eq(companyMembers.userId, userId)))
      .limit(1);
    if (existing) {
      await tx.update(companyMembers).set({ role: invitation.role, status: "ACTIVE" }).where(eq(companyMembers.id, existing.id));
    } else {
      await tx.insert(companyMembers).values({
        companyId: invitation.companyId,
        userId,
        role: invitation.role,
        status: "ACTIVE",
        invitedById: invitation.invitedById,
      });
    }
    await tx.update(companyInvitations).set({ status: "ACCEPTED", acceptedAt: new Date() }).where(eq(companyInvitations.id, invitation.id));
  });
  await notifyUser(invitation.invitedById, {
    type: "TEAM_INVITATION",
    title: `${invitation.email} joined ${invitation.company.name}`,
    link: `${companyHome(invitation.company)}/team`,
    email: false,
  });
  await audit({ actorId: userId, action: "company.member.join", entityType: "company", entityId: invitation.companyId, after: { role: invitation.role } });
  return invitation;
}

export async function changeMemberRole(companyId: string, actorId: string, memberId: string, role: typeof companyMembers.$inferInsert.role) {
  const [member] = await db
    .select()
    .from(companyMembers)
    .where(and(eq(companyMembers.id, memberId), eq(companyMembers.companyId, companyId)))
    .limit(1);
  if (!member) throw new ActionError("Team member not found.", "NOT_FOUND");
  if (member.role === "OWNER") throw new ActionError("The owner's role cannot be changed here.", "FORBIDDEN");
  if (member.userId === actorId) throw new ActionError("You cannot change your own role.", "FORBIDDEN");
  await db.update(companyMembers).set({ role }).where(eq(companyMembers.id, memberId));
  await audit({ actorId, action: "company.member.role", entityType: "companyMember", entityId: memberId, before: { role: member.role }, after: { role } });
}

export async function removeMember(companyId: string, actorId: string, memberId: string) {
  const [member] = await db
    .select()
    .from(companyMembers)
    .where(and(eq(companyMembers.id, memberId), eq(companyMembers.companyId, companyId)))
    .limit(1);
  if (!member) throw new ActionError("Team member not found.", "NOT_FOUND");
  if (member.role === "OWNER") throw new ActionError("The company owner cannot be removed.", "FORBIDDEN");
  if (member.userId === actorId) throw new ActionError("You cannot remove yourself.", "FORBIDDEN");
  await db.update(companyMembers).set({ status: "REMOVED" }).where(eq(companyMembers.id, memberId));
  await audit({ actorId, action: "company.member.remove", entityType: "companyMember", entityId: memberId, before: { role: member.role } });
}

export async function revokeInvitation(companyId: string, actorId: string, invitationId: string) {
  const [row] = await db
    .select()
    .from(companyInvitations)
    .where(and(eq(companyInvitations.id, invitationId), eq(companyInvitations.companyId, companyId), eq(companyInvitations.status, "PENDING")))
    .limit(1);
  if (!row) throw new ActionError("Invitation not found.", "NOT_FOUND");
  await db.update(companyInvitations).set({ status: "REVOKED" }).where(eq(companyInvitations.id, invitationId));
  await audit({ actorId, action: "company.member.revokeInvite", entityType: "company", entityId: companyId, after: { email: row.email } });
}

export async function listTeam(companyId: string) {
  const members = await db.query.companyMembers.findMany({
    where: eq(companyMembers.companyId, companyId),
    with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true, lastLoginAt: true, status: true } } },
    orderBy: (t, { asc }) => [asc(t.joinedAt)],
  });
  const invitations = await db.query.companyInvitations.findMany({
    where: and(eq(companyInvitations.companyId, companyId), eq(companyInvitations.status, "PENDING")),
    with: { invitedBy: { columns: { id: true, name: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return { members: members.filter((m) => m.status !== "REMOVED"), invitations };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
