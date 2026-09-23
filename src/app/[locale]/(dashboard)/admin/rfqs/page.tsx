import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, localized } from "@/lib/utils";
import { categoryFilterOptions } from "@/modules/admin/products/queries";
import { RFQ_TABS, listAdminRfqs, rfqTabCountsAll, type RfqTab } from "@/modules/admin/rfqs/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "RFQs", robots: { index: false } };

export default async function AdminRfqsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.rfqs.read");
  const t = await getTranslations("admin.rfqs");
  const tc = await getTranslations("admin.common");
  const tab = (RFQ_TABS.includes(str(sp.tab) as RfqTab) ? str(sp.tab) : "all") as RfqTab;
  const q = str(sp.q);
  const categoryId = str(sp.category);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts, categories] = await Promise.all([listAdminRfqs({ tab, q, categoryId, page }), rfqTabCountsAll(), categoryFilterOptions()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={RFQ_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/rfqs", { tab: value, q, category: categoryId }), count: counts[value] }))} />
      <FilterBar
        q={q}
        qPlaceholder={t("searchPlaceholder")}
        keep={{ tab }}
        selects={[{ name: "category", value: categoryId, allLabel: t("allCategories"), options: categories.map((c) => ({ value: c.id, label: `${"— ".repeat(c.level)}${localized(c, "name", locale)}` })) }]}
        submitLabel={tc("search")}
        clearHref={qs("/admin/rfqs", { tab })}
        clearLabel={tc("clear")}
        className="mb-5"
      />
      {rows.length === 0 ? (
        <EmptyState icon={<FileText />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colRfq")}</TH>
                <TH>{t("colBuyer")}</TH>
                <TH className="hidden lg:table-cell">{t("colCategory")}</TH>
                <TH className="hidden md:table-cell text-right">{t("colQuantity")}</TH>
                <TH className="text-right">{t("colQuotations")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden sm:table-cell">{t("colVisibility")}</TH>
                <TH className="hidden xl:table-cell">{t("colDeadline")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[320px]">
                    <Link href={`/admin/rfqs/${r.id}`} className="block truncate font-medium text-ink-900 hover:underline">
                      {r.title}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {r.rfqNumber} · {formatDate(r.createdAt, locale)}
                      {r.isPriority ? <Badge size="sm" variant="brass" className="ml-2">{t("priority")}</Badge> : null}
                    </p>
                  </TD>
                  <TD>
                    <Link href={`/admin/companies/${r.buyer.id}`} className="hover:underline">
                      {r.buyer.name}
                    </Link>
                    <span className="block text-xs text-steel-500">{r.buyer.countryCode}</span>
                  </TD>
                  <TD className="hidden text-xs lg:table-cell">{r.category ? localized(r.category, "name", locale) : "—"}</TD>
                  <TD className="hidden text-right tabular-nums md:table-cell">
                    {r.quantity.toLocaleString()} {r.unit}
                  </TD>
                  <TD className="text-right tabular-nums">{r.quotationCount}</TD>
                  <TD>
                    <StatusBadge status={r.status} size="sm" />
                  </TD>
                  <TD className="hidden text-xs sm:table-cell">{t(`visibility.${r.visibility}`)}</TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 xl:table-cell">{r.quoteDeadline ? formatDate(r.quoteDeadline, locale) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/rfqs", { tab, q, category: categoryId, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
