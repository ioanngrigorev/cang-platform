import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InviteMemberButton, TeamTable } from "@/components/buyer/team-manager";
import { PageHeader } from "@/components/ui";
import { getAuth, canCompany, requireCompany } from "@/modules/auth/current-user";
import { listTeam } from "@/modules/team/service";

export const metadata: Metadata = { title: "Team", robots: { index: false } };

export default async function BuyerTeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user, company } = await requireCompany({ permission: "company.profile.read", buyer: true });
  const auth = await getAuth();
  const canManage = canCompany(auth, "company.members.manage");
  const t = await getTranslations("buyer.team");

  const { members, invitations } = await listTeam(company.id);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={canManage ? <InviteMemberButton /> : undefined} />
      <TeamTable
        locale={locale}
        canManage={canManage}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          status: m.status,
          title: m.title,
          joinedAt: m.joinedAt.toISOString(),
          isMe: m.userId === user.id,
          user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl, lastLoginAt: m.user.lastLoginAt ? m.user.lastLoginAt.toISOString() : null } : null,
        }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
          invitedBy: i.invitedBy?.name ?? null,
        }))}
      />
    </>
  );
}
