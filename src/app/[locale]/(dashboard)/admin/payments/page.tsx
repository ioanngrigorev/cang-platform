import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { JsonDetails } from "@/components/admin/json-details";
import { PaymentAdminButtons } from "@/components/admin/payment-actions";
import { EmptyState, LinkTabs, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { PAYMENT_TABS, listAdminPayments, paymentTabCountsAll, paymentTotals, paymentTransactionsFor, type PaymentTab } from "@/modules/admin/payments/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function AdminPaymentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.payments.read");
  const t = await getTranslations("admin.payments");
  const tc = await getTranslations("admin.common");
  const tab = (PAYMENT_TABS.includes(str(sp.tab) as PaymentTab) ? str(sp.tab) : "pending") as PaymentTab;
  const q = str(sp.q);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts, totals] = await Promise.all([listAdminPayments({ tab, q, page }), paymentTabCountsAll(), paymentTotals()]);
  const txns = await paymentTransactionsFor(rows.filter((r) => r.transactions > 0).map((r) => r.id));
  const canWrite = canPlatform(auth, "admin.payments.write");
  const sum = (statuses: string[]) => {
    const by = new Map<string, number>();
    for (const r of totals) if (statuses.includes(r.status)) by.set(r.currency, (by.get(r.currency) ?? 0) + r.total);
    return [...by.entries()].map(([c, v]) => formatMoney(v, c, locale, { compact: true })).join(" · ") || formatMoney(0, "USD", locale);
  };

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.awaiting")} value={sum(["PENDING", "AUTHORIZED"])} hint={t("stats.awaitingHint", { count: counts.pending })} />
        <StatCard label={t("stats.paid")} value={sum(["PAID"])} hint={t("stats.paidHint", { count: counts.held })} />
        <StatCard label={t("stats.settled")} value={sum(["SETTLED"])} />
        <StatCard label={t("stats.refunded")} value={sum(["REFUNDED"])} />
      </div>
      <LinkTabs current={tab} className="mb-4" tabs={PAYMENT_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/payments", { tab: value, q }), count: counts[value] }))} />
      <FilterBar q={q} qPlaceholder={t("searchPlaceholder")} keep={{ tab }} submitLabel={tc("search")} clearHref={qs("/admin/payments", { tab })} clearLabel={tc("clear")} className="mb-5" />
      {rows.length === 0 ? (
        <EmptyState icon={<CreditCard />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colPayment")}</TH>
                <TH>{t("colOrder")}</TH>
                <TH className="hidden lg:table-cell">{t("colParties")}</TH>
                <TH className="text-right">{t("colAmount")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden md:table-cell">{t("colEscrow")}</TH>
                <TH className="hidden xl:table-cell">{t("colProvider")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const rowTxns = txns.filter((x) => x.paymentId === r.id);
                return (
                  <TR key={r.id}>
                    <TD>
                      <span className="whitespace-nowrap font-medium text-ink-900">{r.paymentNumber}</span>
                      <span className="block text-xs text-steel-500">
                        {r.milestoneLabel ?? humanize(r.kind)} · {humanize(r.method)}
                        {r.providerReference ? ` · ${r.providerReference}` : ""}
                      </span>
                      <span className="block text-[11px] text-steel-400">
                        {r.dueAt ? `${t("due")} ${formatDate(r.dueAt, locale)}` : ""}
                        {r.paidAt ? ` · ${t("paid")} ${formatDate(r.paidAt, locale)}` : ""}
                      </span>
                      {rowTxns.length ? <JsonDetails summary={t("transactions", { count: rowTxns.length })} value={rowTxns.map((x) => ({ type: x.type, status: x.status, amount: x.amount, currency: x.currency, providerTxnId: x.providerTxnId, note: x.note, at: x.createdAt }))} className="mt-1" /> : null}
                    </TD>
                    <TD>
                      {r.order ? (
                        <Link href={`/admin/orders/${r.order.id}`} className="whitespace-nowrap hover:underline">
                          {r.order.orderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="hidden text-xs lg:table-cell">
                      {r.payer ? (
                        <Link href={`/admin/companies/${r.payer.id}`} className="hover:underline">
                          {r.payer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <span className="text-steel-400"> → </span>
                      {r.payee ? (
                        <Link href={`/admin/companies/${r.payee.id}`} className="hover:underline">
                          {r.payee.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums">
                      {formatMoney(r.amount, r.currency, locale)}
                      {r.feeAmount > 0 ? <span className="block text-[11px] font-normal text-steel-500">{t("fee")} {formatMoney(r.feeAmount, r.currency, locale)}</span> : null}
                    </TD>
                    <TD>
                      <StatusBadge status={r.status} size="sm" />
                    </TD>
                    <TD className="hidden md:table-cell">
                      <StatusBadge status={r.escrowStatus} size="sm" />
                    </TD>
                    <TD className="hidden max-w-[180px] truncate text-xs xl:table-cell" title={r.provider?.name ?? undefined}>{r.provider?.name ?? "—"}</TD>
                    <TD className="text-right">
                      <PaymentAdminButtons paymentId={r.id} status={r.status} escrowStatus={r.escrowStatus} amount={r.amount} currency={r.currency} canWrite={canWrite} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/payments", { tab, q, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
