import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { ProductAdminActions } from "@/components/admin/product-actions";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, localized, timeAgo } from "@/lib/utils";
import { PRODUCT_TABS, categoryFilterOptions, listAdminProducts, productTabCounts, type ProductTab } from "@/modules/admin/products/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Product moderation", robots: { index: false } };

export default async function AdminProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.products.moderate");
  const t = await getTranslations("admin.products");
  const tc = await getTranslations("admin.common");
  const tab = (PRODUCT_TABS.includes(str(sp.tab) as ProductTab) ? str(sp.tab) : "pending") as ProductTab;
  const q = str(sp.q);
  const categoryId = str(sp.category);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts, categories] = await Promise.all([listAdminProducts({ tab, q, categoryId, page }), productTabCounts(), categoryFilterOptions()]);
  const canModerate = canPlatform(auth, "admin.products.moderate");

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={PRODUCT_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/products", { tab: value, q, category: categoryId }), count: counts[value] }))} />
      <FilterBar
        q={q}
        qPlaceholder={t("searchPlaceholder")}
        keep={{ tab }}
        selects={[{ name: "category", value: categoryId, allLabel: t("allCategories"), options: categories.map((c) => ({ value: c.id, label: `${"— ".repeat(c.level)}${localized(c, "name", locale)}` })) }]}
        submitLabel={tc("search")}
        clearHref={qs("/admin/products", { tab })}
        clearLabel={tc("clear")}
        className="mb-5"
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Boxes />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colProduct")}</TH>
                <TH className="hidden md:table-cell">{t("colSupplier")}</TH>
                <TH className="hidden lg:table-cell">{t("colCategory")}</TH>
                <TH className="hidden sm:table-cell">{t("colPrice")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden xl:table-cell">{t("colUpdated")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[320px]">
                    <Link href={`/admin/products/${r.id}`} className="block truncate font-medium text-ink-900 hover:underline">
                      {r.title}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {r.sku ?? r.slug}
                      {r.isFeatured ? <Badge size="sm" variant="brass" className="ml-2">{t("featured")}</Badge> : null}
                    </p>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <Link href={`/admin/companies/${r.company.id}`} className="hover:underline">
                      {r.company.name}
                    </Link>
                  </TD>
                  <TD className="hidden text-xs lg:table-cell">{localized(r.category, "name", locale)}</TD>
                  <TD className="hidden whitespace-nowrap text-xs sm:table-cell">
                    {r.basePrice != null ? formatMoney(r.basePrice, r.currency, locale) : "—"}
                    <span className="block text-steel-500">
                      MOQ {r.moq} {r.unit}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge status={r.status} size="sm" />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 xl:table-cell">{timeAgo(r.updatedAt, locale)}</TD>
                  <TD className="text-right">
                    <ProductAdminActions productId={r.id} status={r.status} isFeatured={r.isFeatured} searchBoost={0} canModerate={canModerate} compact />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/products", { tab, q, category: categoryId, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
