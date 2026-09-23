import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listSellerQuotations, sellerQuotationTabCounts } from "@/modules/seller/sales/quotations/queries";
import { QUOTATION_TABS, type QuotationTab } from "@/modules/seller/sales/quotations/schemas";

export const metadata: Metadata = { title: "Quotations", robots: { index: false } };

export default async function SellerQuotationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "quotation.read", seller: true });
  const t = await getTranslations("sales.quotations");

  const tab = (QUOTATION_TABS.includes(sp.tab as QuotationTab) ? sp.tab : "all") as QuotationTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, counts] = await Promise.all([listSellerQuotations(company.id, { tab, page }), sellerQuotationTabCounts(company.id)]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button href="/seller/rfqs" variant="secondary">
            {t("browseRfqs")}
          </Button>
        }
      />

      <LinkTabs current={tab} className="mb-5" tabs={QUOTATION_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/seller/quotations?tab=${value}`, count: counts[value] }))} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt />}
          title={tab === "all" ? t("empty") : t("emptyTab")}
          description={tab === "all" ? t("emptyDescription") : t("emptyTabDescription")}
          action={
            <Button href="/seller/rfqs" variant="primary">
              {t("browseRfqs")}
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colQuotation")}</TH>
                <TH>{t("colRfq")}</TH>
                <TH className="hidden md:table-cell">{t("colBuyer")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH className="hidden lg:table-cell">{t("colValid")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden sm:table-cell">{t("colUpdated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ quotation: q, rfq, buyer }) => {
                const expired = q.validUntil && q.validUntil.getTime() < Date.now() && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status);
                return (
                  <TR key={q.id}>
                    <TD>
                      <Link href={`/seller/quotations/${q.id}`} className="font-medium text-ink-900 hover:underline">
                        {q.quotationNumber}
                      </Link>
                      <p className="text-xs text-steel-500">{t("revision", { n: q.revisionNumber })}</p>
                    </TD>
                    <TD className="max-w-[280px]">
                      <Link href={`/seller/rfqs/${rfq.id}`} className="line-clamp-2 text-ink-900 hover:underline">
                        {rfq.title}
                      </Link>
                      <p className="text-xs text-steel-500">{rfq.rfqNumber}</p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-steel-600">
                        {buyer.name}
                        <VerifiedMark status={buyer.verificationStatus} />
                      </span>
                      <p className="text-xs text-steel-500">{buyer.countryCode}</p>
                    </TD>
                    <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(q.total, q.currency, locale)}</TD>
                    <TD className="hidden whitespace-nowrap lg:table-cell">
                      {q.validUntil ? <span className={expired ? "text-danger-600" : "text-steel-600"}>{formatDate(q.validUntil, locale)}</span> : <span className="text-steel-400">—</span>}
                    </TD>
                    <TD>
                      <StatusBadge status={q.status} label={t(`status.${q.status}`)} />
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{timeAgo(q.updatedAt, locale)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/quotations?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
