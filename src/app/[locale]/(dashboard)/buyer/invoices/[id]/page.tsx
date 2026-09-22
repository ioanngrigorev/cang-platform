import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/buyer/print-button";
import { Card, CardContent, PageHeader, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerInvoice } from "@/modules/payments/queries";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function BuyerInvoiceDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "payments.read", buyer: true });
  const t = await getTranslations("payments.invoices");

  const inv = await getBuyerInvoice(company.id, id);
  if (!inv) notFound();

  const lines = inv.lineItems ?? [];
  const balance = Math.max(0, Math.round((inv.total - inv.amountPaid) * 100) / 100);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { label: t("title"), href: "/buyer/invoices" },
            { label: inv.invoiceNumber },
          ]}
          title={t("detailTitle", { number: inv.invoiceNumber })}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={inv.status} />
              <span>{humanize(inv.type)}</span>
            </span>
          }
          actions={<PrintButton label={t("print")} />}
        />
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="space-y-8 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-ink-900">{humanize(inv.type)}</p>
              <p className="mt-1 text-sm text-steel-600">{inv.invoiceNumber}</p>
              {inv.order ? (
                <p className="mt-1 text-sm text-steel-600">
                  {t("orderRef")}:{" "}
                  <Link href={`/buyer/orders/${inv.order.id}`} className="font-medium text-ink-900 hover:underline">
                    {inv.order.orderNumber}
                  </Link>
                </p>
              ) : null}
            </div>
            <dl className="text-sm sm:text-right">
              <div className="flex gap-3 sm:justify-end">
                <dt className="text-steel-500">{t("issueDate")}</dt>
                <dd className="font-medium text-ink-900">{inv.issuedAt ? formatDate(inv.issuedAt, locale) : "—"}</dd>
              </div>
              <div className="mt-1 flex gap-3 sm:justify-end">
                <dt className="text-steel-500">{t("dueDate")}</dt>
                <dd className="font-medium text-ink-900">{inv.dueAt ? formatDate(inv.dueAt, locale) : "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">{t("issuedBy")}</p>
              <p className="mt-1 font-medium text-ink-900">{inv.issuerCompany?.name ?? "—"}</p>
              {inv.issuerCompany?.address ? <p className="text-sm text-steel-600">{inv.issuerCompany.address}</p> : null}
              <p className="text-sm text-steel-600">
                {[inv.issuerCompany?.city, inv.issuerCompany?.countryCode].filter(Boolean).join(", ")}
              </p>
              {inv.issuerCompany?.taxId ? <p className="text-sm text-steel-600">Tax ID: {inv.issuerCompany.taxId}</p> : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">{t("billedTo")}</p>
              <p className="mt-1 font-medium text-ink-900">{inv.recipientCompany?.name ?? company.name}</p>
              {inv.recipientCompany?.address ? <p className="text-sm text-steel-600">{inv.recipientCompany.address}</p> : null}
              <p className="text-sm text-steel-600">
                {[inv.recipientCompany?.city, inv.recipientCompany?.countryCode].filter(Boolean).join(", ")}
              </p>
              {inv.recipientCompany?.taxId ? <p className="text-sm text-steel-600">Tax ID: {inv.recipientCompany.taxId}</p> : null}
            </div>
          </div>

          {inv.order?.incoterm || inv.order?.paymentTerms ? (
            <div className="grid gap-4 border-y border-steel-100 py-4 text-sm sm:grid-cols-2">
              {inv.order?.incoterm ? (
                <p>
                  <span className="text-steel-500">{t("incoterm")}: </span>
                  <span className="font-medium text-ink-900">{inv.order.incoterm}</span>
                </p>
              ) : null}
              {inv.order?.paymentTerms ? (
                <p>
                  <span className="text-steel-500">{t("paymentTerms")}: </span>
                  <span className="font-medium text-ink-900">{inv.order.paymentTerms}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-steel-200 text-left text-xs font-semibold uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="py-2 pr-4">{t("description")}</th>
                  <th className="py-2 pr-4 text-right">{t("quantity")}</th>
                  <th className="py-2 pr-4 text-right">{t("unitPrice")}</th>
                  <th className="py-2 text-right">{t("lineTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-steel-500">
                      {t("noLines")}
                    </td>
                  </tr>
                ) : (
                  lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 text-ink-900">{l.description}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-steel-600">{formatNumber(l.quantity, locale)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-steel-600">{formatMoney(l.unitPrice, inv.currency, locale, { maxFractionDigits: 4 })}</td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-ink-900">{formatMoney(l.total, inv.currency, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-steel-600">{t("subtotal")}</dt>
              <dd className="tabular-nums text-ink-900">{formatMoney(inv.subtotal, inv.currency, locale)}</dd>
            </div>
            {inv.taxAmount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-steel-600">{t("tax")}</dt>
                <dd className="tabular-nums text-ink-900">{formatMoney(inv.taxAmount, inv.currency, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-steel-200 pt-2">
              <dt className="font-semibold text-ink-900">{t("total")}</dt>
              <dd className="font-display text-lg font-semibold tabular-nums text-ink-900">{formatMoney(inv.total, inv.currency, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel-600">{t("amountPaid")}</dt>
              <dd className="tabular-nums text-success-700">{formatMoney(inv.amountPaid, inv.currency, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-ink-900">{t("balance")}</dt>
              <dd className="font-medium tabular-nums text-ink-900">{formatMoney(balance, inv.currency, locale)}</dd>
            </div>
          </dl>

          {inv.notes ? (
            <div className="border-t border-steel-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">{t("notes")}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-steel-600">{inv.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
