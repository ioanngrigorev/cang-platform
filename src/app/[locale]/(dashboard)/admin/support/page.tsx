import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { priorityVariant } from "@/components/admin/badges";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { timeAgo } from "@/lib/utils";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { TICKET_PRIORITIES, TICKET_TABS, listTickets, ticketTabCounts, type TicketTab } from "@/modules/admin/support/queries";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

export default async function AdminSupportPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.support.write");
  const t = await getTranslations("admin.support");
  const tc = await getTranslations("admin.common");
  const tab = (TICKET_TABS.includes(str(sp.tab) as TicketTab) ? str(sp.tab) : "open") as TicketTab;
  const q = str(sp.q);
  const priority = str(sp.priority);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts] = await Promise.all([listTickets({ tab, q, priority, page }), ticketTabCounts()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={TICKET_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/support", { tab: value, q, priority }), count: counts[value] }))} />
      <FilterBar
        q={q}
        qPlaceholder={t("searchPlaceholder")}
        keep={{ tab }}
        selects={[{ name: "priority", value: priority, allLabel: t("allPriorities"), options: TICKET_PRIORITIES.map((x) => ({ value: x, label: t(`priorities.${x}`) })) }]}
        submitLabel={tc("search")}
        clearHref={qs("/admin/support", { tab })}
        clearLabel={tc("clear")}
        className="mb-5"
      />
      {rows.length === 0 ? (
        <EmptyState icon={<LifeBuoy />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colTicket")}</TH>
                <TH>{t("colRequester")}</TH>
                <TH>{t("priority")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden md:table-cell">{t("colAssignee")}</TH>
                <TH className="hidden lg:table-cell">{t("colUpdated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[360px]">
                    <Link href={`/admin/support/${r.id}`} className="block truncate font-medium text-ink-900 hover:underline">
                      {r.subject}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {r.ticketNumber} · {r.category}
                    </p>
                  </TD>
                  <TD className="text-xs">
                    <Link href={`/admin/users/${r.requester.id}`} className="text-ink-900 hover:underline">
                      {r.requester.name}
                    </Link>
                    <span className="block text-steel-500">{r.company?.name ?? r.requester.email}</span>
                  </TD>
                  <TD>
                    <Badge size="sm" variant={priorityVariant(r.priority)}>
                      {t(`priorities.${r.priority}`)}
                    </Badge>
                  </TD>
                  <TD>
                    <StatusBadge status={r.status} label={t(`statuses.${r.status}`)} size="sm" />
                  </TD>
                  <TD className="hidden text-xs md:table-cell">{r.assignee?.name ?? <span className="text-steel-400">{t("unassigned")}</span>}</TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 lg:table-cell">{timeAgo(r.updatedAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/support", { tab, q, priority, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
