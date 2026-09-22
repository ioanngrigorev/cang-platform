import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { ProductFilters } from "@/components/marketplace/product-filters";
import { ProductListing, SupplierListing } from "@/components/marketplace/product-listing";
import { SupplierFilters } from "@/components/marketplace/supplier-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { JsonLd, LinkTabs, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo";
import { buildQuery, first, parseProductFilters, parseSupplierFilters, type SearchParams } from "@/modules/catalog/filters";
import {
  getCertifications,
  getExportCountriesFacet,
  getIndustriesWithCounts,
  getProvincesWithSellers,
  getRootCategories,
} from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

const POPULAR = ["backpack", "furniture", "packaging", "garment", "electronics", "footwear"];

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const q = first(sp.q);
  return pageMetadata({
    locale,
    path: "/search",
    title: q ? t("search.metaTitle", { q }) : t("search.noQuery"),
    description: q ? t("search.metaDescription", { q }) : t("search.noQueryHint"),
    // Search result pages are never indexed — they duplicate the category/industry landings.
    noIndex: true,
  });
}

export default async function SearchPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const q = first(sp.q) ?? "";
  const type = first(sp.type) === "suppliers" ? "suppliers" : "products";
  const path = "/search";

  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.search") },
  ];

  if (!q.trim()) {
    return (
      <div className="container py-8">
        <JsonLd
          data={breadcrumbJsonLd(
            [
              { name: t("breadcrumbs.home"), path: "/" },
              { name: t("breadcrumbs.search"), path },
            ],
            locale,
          )}
        />
        <PageHeader title={t("search.noQuery")} description={t("search.noQueryHint")} breadcrumbs={crumbs} />
        <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("search.popular")}</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((term) => (
              <ChipLink key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                {term}
              </ChipLink>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href="/products" variant="secondary">
              {t("breadcrumbs.products")}
            </Button>
            <Button href="/manufacturers" variant="secondary">
              {t("breadcrumbs.manufacturers")}
            </Button>
            <Button href="/buyer/rfqs/new">{t("rfq.postYourRfq")}</Button>
          </div>
        </div>
      </div>
    );
  }

  // Both counts are needed for the tabs; the inactive side only needs its total.
  const productFilters = parseProductFilters(sp);
  const supplierFilters = parseSupplierFilters(sp);
  const [productResult, supplierResult] = await Promise.all([
    search().searchProducts(type === "products" ? productFilters : { q, pageSize: 1 }),
    search().searchSuppliers(type === "suppliers" ? supplierFilters : { q, pageSize: 1 }),
  ]);

  const [provinces, certs, categories, exportCountries, industries] = await Promise.all([
    getProvincesWithSellers(),
    getCertifications(),
    getRootCategories(),
    type === "suppliers" ? getExportCountriesFacet() : Promise.resolve([]),
    type === "suppliers" ? getIndustriesWithCounts() : Promise.resolve([]),
  ]);

  const tabs = [
    { label: t("search.products"), value: "products", href: `${path}${buildQuery(sp, { type: null })}`, count: productResult.total },
    { label: t("search.suppliers"), value: "suppliers", href: `${path}${buildQuery(sp, { type: "suppliers" })}`, count: supplierResult.total },
  ];
  const activeTotal = type === "products" ? productResult.total : supplierResult.total;

  return (
    <div className="container py-8">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t("breadcrumbs.home"), path: "/" },
            { name: t("breadcrumbs.search"), path },
          ],
          locale,
        )}
      />
      <PageHeader title={t("search.resultsFor", { q })} breadcrumbs={crumbs} eyebrow={t("search.title")} />

      <LinkTabs tabs={tabs} current={type} className="mb-6" />

      {activeTotal === 0 && !Object.keys(sp).some((k) => k !== "q" && k !== "type" && k !== "page" && sp[k]) ? (
        <EmptyState
          icon={<SearchX />}
          title={t("search.noResults", { q })}
          description={t("search.noResultsHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href={type === "products" ? `${path}?q=${encodeURIComponent(q)}&type=suppliers` : `${path}?q=${encodeURIComponent(q)}`} variant="secondary" size="sm">
                {type === "products" ? t("search.suppliers") : t("search.products")}
              </Button>
              <Button href="/buyer/rfqs/new" size="sm">
                {t("rfq.postYourRfq")}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {type === "products" ? (
              <ProductFilters sp={sp} path={path} options={{ provinces, certifications: certs, categories, categoryParam: "category" }} />
            ) : (
              <SupplierFilters sp={sp} path={path} options={{ certifications: certs, exportCountries, industries, provinces }} hidden={{ type: "suppliers" }} />
            )}
          </aside>
          <div className="min-w-0">
            {type === "products" ? (
              <ProductListing result={productResult} sp={sp} path={path} locale={locale} itemListName={t("search.metaTitle", { q })} />
            ) : (
              <SupplierListing result={supplierResult} sp={sp} path={path} locale={locale} columns={3} itemListName={t("search.metaTitle", { q })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
