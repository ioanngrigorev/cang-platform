import { CreditCard, Landmark, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, EmptyState, LinkTabs, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { SELLER_PAYMENT_TABS, listSellerPayments, sellerPaymentTabCounts, sellerPaymentTotals, type SellerPaymentTab } from "@/modules/seller/sales/payments";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function SellerPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "payments.read", seller: true });
  const t = await getTranslations("sales.payments");

  const tab = (SELLER_PAYMENT_TABS.includes(sp.tab as SellerPaymentTab) ? sp.tab : "all") as SellerPaymentTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, counts, totals] = await Promise.all([listSellerPayments(company.id, { tab, page }), sellerPaymentTabCounts(company.id), sellerPaymentTotals(company.id)]);
  const main = totals[0];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
        <StatCard label={t("held")} value={formatMoney(main?.held ?? 0, main?.currency ?? "USD", locale)} hint={t("heldHint")} icon={<ShieldCheck />} />
        <StatCard label={t("released30d")} value={formatMoney(main?.released30d ?? 0, main?.currency ?? "USD", locale)} hint={t("released30dHint")} icon={<Landmark />} />
        <StatCard label={t("pending")} value={formatMoney(main?.pending ?? 0, main?.currency ?? "USD", locale)} hint={t("pendingHint")} icon={<CreditCard />} />
      </div>

      <LinkTabs current={tab} className="mb-5" tabs={SELLER_PAYMENT_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/seller/payments?tab=${value}`, count: counts[value] }))} />

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
                <TH className="hidden md:table-cell">{t("colMethod")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden md:table-cell">{t("colEscrow")}</TH>
                <TH className="hidden lg:table-cell">{t("colDate")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ payment: p, order, buyer, provider }) => (
                <TR key={p.id}>
                  <TD>
                    {order ? (
                      <Link href={`/seller/orders/${order.id}`} className="font-medium text-ink-900 hover:underline">
                        {p.paymentNumber}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink-900">{p.paymentNumber}</span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {order ? (
                      <>
                        <Link href={`/seller/orders/${order.id}`} className="text-steel-600 hover:underline">
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-steel-500">{buyer?.name}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-steel-600">{p.milestoneLabel ?? humanize(p.kind)}</TD>
                  <TD className="whitespace-nowrap">
                    <span className="font-medium tabular-nums">{formatMoney(p.amount, p.currency, locale)}</span>
                    {p.feeAmount > 0 ? <p className="text-xs text-steel-500">{t("fee", { amount: formatMoney(p.feeAmount, p.currency, locale) })}</p> : null}
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{provider?.name ?? humanize(p.method)}</TD>
                  <TD>
                    <StatusBadge status={p.status} />
                  </TD>
                  <TD className="hidden md:table-cell">{p.escrowStatus === "NOT_APPLICABLE" ? <span className="text-steel-400">—</span> : <StatusBadge status={p.escrowStatus} />}</TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-500 lg:table-cell">
                    {p.releasedAt ? t("releasedOn", { date: formatDate(p.releasedAt, locale) }) : p.paidAt ? t("paidOn", { date: formatDate(p.paidAt, locale) }) : p.dueAt ? t("dueOn", { date: formatDate(p.dueAt, locale) }) : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/payments?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}

      <Card className="mt-6 border-info-100 bg-info-50/40">
        <CardContent className="py-3 text-xs text-info-700">{t("licenceNote")}</CardContent>
      </Card>
    </>
  );
}
