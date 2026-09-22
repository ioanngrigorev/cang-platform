import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, EmptyState, LinkTabs, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { buyerPaymentTotals, listBuyerPayments, paymentTabCounts, type PaymentListTab } from "@/modules/payments/queries";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

const TABS: PaymentListTab[] = ["all", "due", "paid", "held"];

export default async function BuyerPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "payments.read", buyer: true });
  const t = await getTranslations("payments.list");

  const tab = (TABS.includes(sp.tab as PaymentListTab) ? sp.tab : "all") as PaymentListTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, counts, totals] = await Promise.all([listBuyerPayments(company.id, { tab, page }), paymentTabCounts(company.id), buyerPaymentTotals(company.id)]);
  const totalsRow = totals[0];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {totalsRow ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={t("totalDue")} value={formatMoney(totalsRow.due, totalsRow.currency, locale)} icon={<CreditCard />} />
          <StatCard label={t("totalHeld")} value={formatMoney(totalsRow.held, totalsRow.currency, locale)} />
          <StatCard label={t("totalPaid")} value={formatMoney(totalsRow.paid, totalsRow.currency, locale)} />
        </div>
      ) : null}

      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/buyer/payments?tab=${value}`, count: counts[value] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={<CreditCard />} title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colPayment")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH>{t("colMilestone")}</TH>
                <TH>{t("colAmount")}</TH>
                <TH className="hidden lg:table-cell">{t("colDue")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden md:table-cell">{t("colEscrow")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link href={`/buyer/payments/${p.id}`} className="font-medium text-ink-900 hover:underline">
                      {p.paymentNumber}
                    </Link>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {p.order ? (
                      <Link href={`/buyer/orders/${p.order.id}`} className="text-steel-600 hover:underline">
                        {p.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-steel-600">{p.milestoneLabel ?? humanize(p.kind)}</TD>
                  <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(p.amount, p.currency, locale)}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{p.dueAt ? formatDate(p.dueAt, locale) : "—"}</TD>
                  <TD>
                    <StatusBadge status={p.status} />
                  </TD>
                  <TD className="hidden md:table-cell">{p.escrowStatus === "NOT_APPLICABLE" ? <span className="text-steel-400">—</span> : <StatusBadge status={p.escrowStatus} />}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/payments?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}

      <Card className="mt-6 border-info-100 bg-info-50/40">
        <CardContent className="py-3 text-xs text-info-700">{t("licenceNote")}</CardContent>
      </Card>
    </>
  );
}
