import { FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listSellerInvoices, sellerInvoiceTotals } from "@/modules/seller/sales/invoices";

export const metadata: Metadata = { title: "Invoices", robots: { index: false } };

export default async function SellerInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "payments.read", seller: true });
  const t = await getTranslations("sales.invoices");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, totals] = await Promise.all([listSellerInvoices(company.id, { page }), sellerInvoiceTotals(company.id)]);
  const main = totals[0];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
        <StatCard label={t("outstanding")} value={formatMoney(main?.outstanding ?? 0, main?.currency ?? "USD", locale)} hint={t("outstandingHint")} />
        <StatCard label={t("paid")} value={formatMoney(main?.paid ?? 0, main?.currency ?? "USD", locale)} hint={t("paidHint")} />
        <StatCard label={t("overdue")} value={formatNumber(main?.overdue ?? 0, locale)} hint={t("overdueHint")} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colInvoice")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colRecipient")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH className="hidden lg:table-cell">{t("colIssued")}</TH>
                <TH className="hidden lg:table-cell">{t("colDue")}</TH>
                <TH>{t("colStatus")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ invoice, order, recipient }) => (
                <TR key={invoice.id}>
                  <TD>
                    <Link href={`/seller/invoices/${invoice.id}`} className="font-medium text-ink-900 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-steel-500">{t(`types.${invoice.type}`)}</p>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {order ? (
                      <Link href={`/seller/orders/${order.id}`} className="text-steel-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{recipient?.name ?? "—"}</TD>
                  <TD className="whitespace-nowrap">
                    <span className="font-medium tabular-nums">{formatMoney(invoice.total, invoice.currency, locale)}</span>
                    {invoice.amountPaid > 0 && invoice.amountPaid < invoice.total ? <p className="text-xs text-steel-500">{t("paidPart", { amount: formatMoney(invoice.amountPaid, invoice.currency, locale) })}</p> : null}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{invoice.issuedAt ? formatDate(invoice.issuedAt, locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{invoice.dueAt ? formatDate(invoice.dueAt, locale) : "—"}</TD>
                  <TD>
                    <StatusBadge status={invoice.status} label={humanize(invoice.status)} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/invoices?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
