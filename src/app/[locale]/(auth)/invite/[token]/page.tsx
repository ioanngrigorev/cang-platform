import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AcceptInvitation } from "@/components/buyer/accept-invitation";
import { Alert, Avatar, Card, CardContent } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";
import { findInvitationByToken } from "@/modules/team/service";

export const metadata: Metadata = { title: "Team invitation", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const auth = await getAuth();
  if (!auth) redirect({ href: `/login?next=/invite/${token}`, locale });

  const t = await getTranslations("buyer.team");
  const invitation = await findInvitationByToken(token);

  if (!invitation) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="space-y-4 py-8 text-center">
          <Building2 className="mx-auto size-8 text-steel-400" />
          <h1 className="text-xl font-semibold text-ink-900">{t("invitations")}</h1>
          <Alert variant="danger">This invitation is invalid, has expired or was already used.</Alert>
          <Link href="/buyer" className="text-sm text-ink-700 underline-offset-4 hover:underline">
            {t("title")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const emailMatches = invitation.email.toLowerCase() === auth!.user.email.toLowerCase();

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="space-y-5 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar src={invitation.company.logoUrl} name={invitation.company.name} size={56} square />
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{invitation.company.name}</h1>
            <p className="mt-1 text-sm text-steel-600">
              {t("inviteRole")}: <span className="font-medium text-ink-900">{t(`roles.${invitation.role}`)}</span>
            </p>
            {invitation.invitedBy?.name ? <p className="text-xs text-steel-500">{invitation.invitedBy.name}</p> : null}
          </div>
        </div>

        {emailMatches ? (
          <AcceptInvitation token={token} label={t("inviteSubmit")} isSeller={invitation.company.isSeller && !invitation.company.isBuyer} />
        ) : (
          <Alert variant="warning">
            This invitation was sent to <strong>{invitation.email}</strong>. You are signed in as {auth!.user.email}. Sign in with the invited address to accept it.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
