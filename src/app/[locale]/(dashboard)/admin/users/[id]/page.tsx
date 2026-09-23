import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonDetails } from "@/components/admin/json-details";
import { UserAdminActions } from "@/components/admin/user-actions";
import { Avatar, Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { getAdminUser } from "@/modules/admin/users/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "User", robots: { index: false } };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.users.read");
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("admin.common");
  const user = await getAdminUser(id);
  if (!user) notFound();

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/users" }, { label: user.name }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size={40} />
            {user.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{user.email}</span>
            <Badge variant={user.platformRole === "USER" ? "neutral" : "ink"}>{t(`roles.${user.platformRole}`)}</Badge>
            <StatusBadge status={user.status} label={t(`statuses.${user.status}`)} />
          </span>
        }
        actions={
          <UserAdminActions
            userId={user.id}
            role={user.platformRole}
            status={user.status}
            canWrite={canPlatform(auth, "admin.users.write")}
            canElevate={auth.user.platformRole === "SUPER_ADMIN"}
            isSelf={auth.user.id === user.id}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("profile")} />
            <CardContent>
              <DataList
                columns={3}
                items={[
                  { label: t("email"), value: `${user.email}${user.emailVerifiedAt ? " ✓" : ""}` },
                  { label: t("phone"), value: user.phone ?? "—" },
                  { label: t("locale"), value: `${user.locale} · ${user.timezone}` },
                  { label: t("twoFactor"), value: user.twoFactorEnabled ? tc("yes") : tc("no") },
                  { label: t("lastLogin"), value: user.lastLoginAt ? `${formatDateTime(user.lastLoginAt, locale)}${user.lastLoginIp ? ` · ${user.lastLoginIp}` : ""}` : "—" },
                  { label: t("sessions"), value: user.sessionCount },
                  { label: t("colJoined"), value: formatDateTime(user.createdAt, locale) },
                  { label: t("updated"), value: formatDateTime(user.updatedAt, locale) },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("memberships")} />
            <CardContent className="p-0">
              {user.memberships.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noMemberships")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("company")}</TH>
                      <TH>{t("memberRole")}</TH>
                      <TH>{tc("status")}</TH>
                      <TH className="hidden sm:table-cell">{t("joined")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {user.memberships.map((m) => (
                      <TR key={m.id}>
                        <TD>
                          <Link href={`/admin/companies/${m.companyId}`} className="font-medium text-ink-900 hover:underline">
                            {m.company.name}
                          </Link>
                          <p className="text-xs text-steel-500">
                            {[m.company.isSeller ? tc("seller") : null, m.company.isBuyer ? tc("buyer") : null].filter(Boolean).join(" · ")}
                          </p>
                        </TD>
                        <TD>
                          {m.role}
                          {m.isPrimary ? <span className="ml-1 text-xs text-steel-500">({t("primary")})</span> : null}
                        </TD>
                        <TD>
                          <StatusBadge status={m.status} size="sm" />
                        </TD>
                        <TD className="hidden text-xs text-steel-600 sm:table-cell">{formatDateTime(m.joinedAt, locale)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("activity")} description={t("activityHint")} />
            <CardContent className="p-0">
              {user.trail.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noActivity")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {user.trail.map((l) => (
                    <li key={l.id} className="px-5 py-2.5 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px]">{l.action}</code>
                        <span className="text-steel-600">
                          {l.entityType}
                          {l.entityId ? ` · ${l.entityId}` : ""}
                        </span>
                        <span className="ml-auto text-xs text-steel-500">{timeAgo(l.createdAt, locale)}</span>
                      </div>
                      {l.before || l.after ? <JsonDetails summary={tc("details")} value={{ before: l.before, after: l.after }} className="mt-1" /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("adminActions")} description={t("adminActionsHint")} />
            <CardContent className="p-0">
              {user.actions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noActivity")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {user.actions.map((l) => (
                    <li key={l.id} className="px-5 py-2.5 text-sm">
                      <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px]">{l.action}</code>
                      <p className="mt-0.5 text-xs text-steel-500">
                        {l.actorType} · {timeAgo(l.createdAt, locale)}
                      </p>
                      {l.after ? <JsonDetails summary={tc("details")} value={l.after} className="mt-1" /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
