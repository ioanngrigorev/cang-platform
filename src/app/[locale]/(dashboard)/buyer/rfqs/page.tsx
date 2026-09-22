import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, Button, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerRfqs, rfqTabCounts, type RfqListTab } from "@/modules/rfq/queries";

export const metadata: Metadata = { title: "My RFQs", robots: { index: false } };

const TABS: RfqListTab[] = ["all", "open", "closed", "awarded", "draft"];

export default async function BuyerRfqsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "rfq.read", buyer: true });
  const t = await getTranslations("rfq.list");

  const tab = (TABS.includes(sp.tab as RfqListTab) ? sp.tab : "all") as RfqListTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, total, totalPages }, counts] = await Promise.all([listBuyerRfqs(company.id, { tab, page }), rfqTabCounts(company.id)]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button href="/buyer/rfqs/new" variant="primary">
            <Plus /> {t("new")}
          </Button>
        }
      />

      <LinkTabs
        current={tab}
        className="mb-5"
        tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/buyer/rfqs?tab=${value}`, count: counts[value] }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button href="/buyer/rfqs/new" variant="primary">
              <Plus /> {t("emptyAction")}
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colRfq")}</TH>
                <TH className="hidden md:table-cell">{t("colCategory")}</TH>
                <TH className="hidden sm:table-cell">{t("colQuantity")}</TH>
                <TH>{t("colQuotations")}</TH>
                <TH className="hidden lg:table-cell">{t("colDeadline")}</TH>
                <TH>{t("colStatus")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/buyer/rfqs/${r.id}`} className="font-medium text-ink-900 hover:underline">
                      {r.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-steel-500">{r.rfqNumber}</p>
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{r.category ? localized(r.category, "name", locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">
                    {formatNumber(r.quantity, locale)} {r.unit}
                  </TD>
                  <TD>
                    {r.quotationCount > 0 ? (
                      <Badge variant={r.status === "OPEN" ? "info" : "neutral"}>{formatNumber(r.quotationCount, locale)}</Badge>
                    ) : (
                      <span className="text-steel-400">—</span>
                    )}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{r.quoteDeadline ? formatDate(r.quoteDeadline, locale) : t("noDeadline")}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/rfqs?tab=${tab}&page=${p}`} className="mt-6" />
          <p className="mt-3 text-center text-xs text-steel-500">{formatNumber(total, locale)}</p>
        </>
      )}
    </>
  );
}
