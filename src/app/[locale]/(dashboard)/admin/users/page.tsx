import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, timeAgo } from "@/lib/utils";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { USER_ROLES, USER_STATUSES, listUsers } from "@/modules/admin/users/queries";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

export default async function AdminUsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.users.read");
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("admin.common");
  const filters = { q: str(sp.q), role: str(sp.role), status: str(sp.status), page: pageParam(sp.page) };
  const { rows, total, page, totalPages } = await listUsers(filters);
  const href = (p: number) => qs("/admin/users", { ...filters, page: p });

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description", { count: total })} />
      <FilterBar
        q={filters.q}
        qPlaceholder={t("searchPlaceholder")}
        selects={[
          { name: "role", value: filters.role, allLabel: t("allRoles"), options: USER_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) })) },
          { name: "status", value: filters.status, allLabel: t("allStatuses"), options: USER_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })) },
        ]}
        submitLabel={tc("search")}
        clearHref="/admin/users"
        clearLabel={tc("clear")}
        className="mb-5"
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Users />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colUser")}</TH>
                <TH>{t("colRole")}</TH>
                <TH>{t("colCompanies")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden md:table-cell">{t("colLastLogin")}</TH>
                <TH className="hidden lg:table-cell">{t("colJoined")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-ink-900 hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-xs text-steel-500">{u.email}</p>
                  </TD>
                  <TD>
                    <Badge variant={u.platformRole === "USER" ? "neutral" : "ink"} size="sm">
                      {t(`roles.${u.platformRole}`)}
                    </Badge>
                  </TD>
                  <TD className="max-w-[260px]">
                    {u.memberships.length === 0 ? (
                      <span className="text-xs text-steel-400">—</span>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {u.memberships.map((m) => (
                          <li key={m.id} className="truncate">
                            <Link href={`/admin/companies/${m.companyId}`} className="text-ink-900 hover:underline">
                              {m.company.name}
                            </Link>{" "}
                            <span className="text-steel-500">· {m.role.toLowerCase()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={u.status} label={t(`statuses.${u.status}`)} size="sm" />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{u.lastLoginAt ? timeAgo(u.lastLoginAt, locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 lg:table-cell">{formatDate(u.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={href} className="mt-6" />
        </>
      )}
    </div>
  );
}
