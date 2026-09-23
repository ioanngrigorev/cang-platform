import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize, timeAgo } from "@/lib/utils";
import { DISPUTE_TABS, disputeTabCounts, listAdminDisputes, type DisputeTab } from "@/modules/admin/disputes/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Disputes", robots: { index: false } };

export default async function AdminDisputesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.disputes.resolve");
  const t = await getTranslations("admin.disputes");
  const tc = await getTranslations("admin.common");
  const tab = (DISPUTE_TABS.includes(str(sp.tab) as DisputeTab) ? str(sp.tab) : "open") as DisputeTab;
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts] = await Promise.all([listAdminDisputes({ tab, page }), disputeTabCounts()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-5" tabs={DISPUTE_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/disputes", { tab: value }), count: counts[value] }))} />
      {rows.length === 0 ? (
        <EmptyState icon={<ShieldAlert />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colDispute")}</TH>
                <TH>{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colParties")}</TH>
                <TH className="text-right">{t("colClaimed")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden lg:table-cell">{t("colRespondBy")}</TH>
                <TH className="hidden xl:table-cell">{t("colOpened")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((d) => (
                <TR key={d.id}>
                  <TD className="max-w-[320px]">
                    <Link href={`/admin/disputes/${d.id}`} className="block truncate font-medium text-ink-900 hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {d.disputeNumber} · {humanize(d.type)}
                    </p>
                  </TD>
                  <TD>
                    <Link href={`/admin/orders/${d.order.id}`} className="hover:underline">
                      {d.order.orderNumber}
                    </Link>
                    <span className="block text-xs text-steel-500">{formatMoney(d.order.total, d.currency, locale)}</span>
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    <Link href={`/admin/companies/${d.raiser.id}`} className="hover:underline">
                      {d.raiser.name}
                    </Link>
                    <span className="text-steel-400"> vs </span>
                    <Link href={`/admin/companies/${d.respondent.id}`} className="hover:underline">
                      {d.respondent.name}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">
                    {d.claimedAmount != null ? formatMoney(d.claimedAmount, d.currency, locale) : "—"}
                    {d.resolutionAmount != null ? <span className="block text-[11px] text-success-700">{t("refunded", { amount: formatMoney(d.resolutionAmount, d.currency, locale) })}</span> : null}
                  </TD>
                  <TD>
                    <StatusBadge status={d.status} size="sm" />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 lg:table-cell">{d.respondBy ? formatDate(d.respondBy, locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 xl:table-cell">{timeAgo(d.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/disputes", { tab, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
