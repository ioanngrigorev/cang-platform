import { FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerInvoices } from "@/modules/payments/queries";

export const metadata: Metadata = { title: "Invoices", robots: { index: false } };

export default async function BuyerInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "payments.read", buyer: true });
  const t = await getTranslations("payments.invoices");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listBuyerInvoices(company.id, { page });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colInvoice")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colIssuer")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH className="hidden lg:table-cell">{t("colIssued")}</TH>
                <TH className="hidden lg:table-cell">{t("colDue")}</TH>
                <TH>{t("colStatus")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ invoice, order, issuer }) => (
                <TR key={invoice.id}>
                  <TD>
                    <Link href={`/buyer/invoices/${invoice.id}`} className="font-medium text-ink-900 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-steel-500">{humanize(invoice.type)}</p>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {order ? (
                      <Link href={`/buyer/orders/${order.id}`} className="text-steel-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{issuer?.name ?? "—"}</TD>
                  <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(invoice.total, invoice.currency, locale)}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{invoice.issuedAt ? formatDate(invoice.issuedAt, locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{invoice.dueAt ? formatDate(invoice.dueAt, locale) : "—"}</TD>
                  <TD>
                    <StatusBadge status={invoice.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/invoices?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
