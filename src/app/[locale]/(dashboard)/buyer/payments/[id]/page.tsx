import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PaymentSchedule } from "@/components/orders/payment-schedule";
import { Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerPayment } from "@/modules/payments/queries";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function BuyerPaymentDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "payments.read", buyer: true });
  const t = await getTranslations("payments.list");

  const p = await getBuyerPayment(company.id, id);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("back"), href: "/buyer/payments" },
          { label: p.paymentNumber },
        ]}
        title={t("detailTitle", { number: p.paymentNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} />
            {p.escrowStatus !== "NOT_APPLICABLE" ? <StatusBadge status={p.escrowStatus} /> : null}
            <span className="font-medium text-ink-900">{formatMoney(p.amount, p.currency, locale)}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("detailTitle", { number: p.paymentNumber })} />
            <CardContent>
              <PaymentSchedule
                locale={locale}
                demoMode={process.env.NODE_ENV !== "production"}
                payments={[
                  {
                    id: p.id,
                    paymentNumber: p.paymentNumber,
                    kind: p.kind,
                    status: p.status,
                    escrowStatus: p.escrowStatus,
                    currency: p.currency,
                    amount: p.amount,
                    milestoneLabel: p.milestoneLabel,
                    dueAt: p.dueAt ? p.dueAt.toISOString() : null,
                    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
                    instructions: p.instructions,
                    provider: p.provider ? { id: p.provider.id, name: p.provider.name, code: p.provider.code } : null,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("transactions")} />
            <CardContent className="p-0">
              {p.transactions.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noTransactions")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("txnType")}</TH>
                      <TH>{t("txnStatus")}</TH>
                      <TH>{t("txnAmount")}</TH>
                      <TH className="hidden sm:table-cell">{t("txnReference")}</TH>
                      <TH className="hidden md:table-cell">{t("txnDate")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {p.transactions.map((tx) => (
                      <TR key={tx.id}>
                        <TD>{humanize(tx.type)}</TD>
                        <TD>
                          <StatusBadge status={tx.status} size="sm" />
                        </TD>
                        <TD className="whitespace-nowrap tabular-nums">{formatMoney(tx.amount, tx.currency, locale)}</TD>
                        <TD className="hidden max-w-[220px] truncate text-xs text-steel-500 sm:table-cell">{tx.providerTxnId ?? "—"}</TD>
                        <TD className="hidden whitespace-nowrap text-steel-600 md:table-cell">{formatDateTime(tx.createdAt, locale)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("detailTitle", { number: "" }).trim()} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("amount"), value: formatMoney(p.amount, p.currency, locale) },
                  { label: t("fee"), value: formatMoney(p.feeAmount, p.currency, locale) },
                  { label: t("net"), value: p.netAmount != null ? formatMoney(p.netAmount, p.currency, locale) : "—" },
                  { label: t("kind"), value: humanize(p.kind) },
                  { label: t("milestone"), value: p.milestoneLabel ?? "—" },
                  { label: t("method"), value: humanize(p.method) },
                  { label: t("provider"), value: p.provider?.name ?? "—" },
                  { label: t("escrow"), value: <StatusBadge status={p.escrowStatus} /> },
                  { label: t("due"), value: p.dueAt ? formatDateTime(p.dueAt, locale) : "—" },
                  { label: t("paid"), value: p.paidAt ? formatDateTime(p.paidAt, locale) : "—" },
                  { label: t("released"), value: p.releasedAt ? formatDateTime(p.releasedAt, locale) : "—" },
                  {
                    label: t("order"),
                    value: p.order ? (
                      <Link href={`/buyer/orders/${p.order.id}`} className="font-medium text-ink-900 hover:underline">
                        {p.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: t("payee"), value: p.order?.supplierCompany?.name ?? "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="border-info-100 bg-info-50/40">
            <CardContent className="py-3 text-xs text-info-700">{t("licenceNote")}</CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
