"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireAuth, requireCompany } from "@/modules/auth/current-user";
import { changeRoleSchema, invitationIdSchema, inviteMemberSchema, memberIdSchema } from "./schemas";
import { acceptInvitation, changeMemberRole, inviteMember, removeMember, revokeInvitation } from "./service";

function revalidate() {
  revalidatePath("/[locale]/buyer/team", "page");
  revalidatePath("/[locale]/seller/team", "page");
}

export async function inviteMemberAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.members.manage" });
    const parsed = parseInput(inviteMemberSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const locale = await getLocale();
    await inviteMember(company.id, user.id, parsed.data, locale);
    revalidate();
    return ok({ email: parsed.data.email }, `Invitation sent to ${parsed.data.email}.`);
  });
}

export async function changeMemberRoleAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.members.manage" });
    const parsed = parseInput(changeRoleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await changeMemberRole(company.id, user.id, parsed.data.memberId, parsed.data.role);
    revalidate();
    return ok(undefined, "Role updated.");
  });
}

export async function removeMemberAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.members.manage" });
    const parsed = parseInput(memberIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await removeMember(company.id, user.id, parsed.data.memberId);
    revalidate();
    return ok(undefined, "Team member removed.");
  });
}

export async function revokeInvitationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.members.manage" });
    const parsed = parseInput(invitationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await revokeInvitation(company.id, user.id, parsed.data.invitationId);
    revalidate();
    return ok(undefined, "Invitation revoked.");
  });
}

/** Accept an invitation — the signed-in user's email must match the invited address. */
export async function acceptInvitationAction(_prev: ActionResult<{ isSeller: boolean }> | null, formData: FormData): Promise<ActionResult<{ isSeller: boolean }>> {
  return runAction(async () => {
    const auth = await requireAuth();
    const token = String(formData.get("token") ?? "");
    const invitation = await acceptInvitation(token, auth.user.id, auth.user.email);
    revalidate();
    return ok({ isSeller: invitation.company.isSeller && !invitation.company.isBuyer }, `You joined ${invitation.company.name}.`);
  });
}
