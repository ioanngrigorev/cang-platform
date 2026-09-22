import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerQuotations } from "@/modules/rfq/queries";

export const metadata: Metadata = { title: "Quotations", robots: { index: false } };

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "REVISED", "ACCEPTED", "REJECTED", "EXPIRED"];

export default async function BuyerQuotationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "quotation.read", buyer: true });
  const t = await getTranslations("rfq.quotations");

  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listBuyerQuotations(company.id, { status, page });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/buyer/quotations"
          className={`rounded-full border px-3 py-1 text-sm ${!status ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-steel-600 hover:bg-steel-50"}`}
        >
          {t("allStatuses")}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/buyer/quotations?status=${s}`}
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-steel-600 hover:bg-steel-50"}`}
          >
            <StatusBadge status={s} size="sm" className="border-none bg-transparent px-0 py-0 text-inherit" />
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Receipt />} title={t("empty")} description={t("emptyDescription")} action={<Button href="/buyer/rfqs/new" variant="primary">{t("openRfq")}</Button>} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colQuotation")}</TH>
                <TH>{t("colSupplier")}</TH>
                <TH className="hidden lg:table-cell">{t("colRfq")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH className="hidden sm:table-cell">{t("colLeadTime")}</TH>
                <TH className="hidden lg:table-cell">{t("colValid")}</TH>
                <TH>{t("colStatus")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ quotation: q, rfq, supplier }) => (
                <TR key={q.id}>
                  <TD>
                    <Link href={`/buyer/quotations/${q.id}`} className="font-medium text-ink-900 hover:underline">
                      {q.quotationNumber}
                    </Link>
                    {q.revisionNumber > 1 ? <p className="text-xs text-steel-500">{t("revisionOf", { n: q.revisionNumber })}</p> : null}
                  </TD>
                  <TD>
                    <Link href={`/supplier/${supplier.slug}`} className="text-ink-900 hover:underline">
                      {supplier.name}
                    </Link>
                  </TD>
                  <TD className="hidden max-w-[240px] lg:table-cell">
                    <Link href={`/buyer/rfqs/${rfq.id}`} className="line-clamp-1 text-steel-600 hover:underline">
                      {rfq.title}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(q.total, q.currency, locale)}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{q.leadTimeDays ? `${q.leadTimeDays} d` : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{q.validUntil ? formatDate(q.validUntil, locale) : "—"}</TD>
                  <TD>
                    <StatusBadge status={q.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/quotations?${status ? `status=${status}&` : ""}page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
