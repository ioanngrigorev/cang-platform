import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { SupplierListing } from "@/components/marketplace/product-listing";
import { SupplierFilters } from "@/components/marketplace/supplier-filters";
import { IndustryTile } from "@/components/marketplace/tiles";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { parseSupplierFilters, type SearchParams } from "@/modules/catalog/filters";
import { getCertifications, getClusters, getExportCountriesFacet, getIndustriesWithCounts, getPlatformStats, getProvincesWithSellers } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const [t, stats] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getPlatformStats()]);
  const filtered = Object.keys(sp).some((k) => k !== "page" && sp[k]);
  return pageMetadata({
    locale,
    path: "/manufacturers",
    title: t("manufacturers.metaTitle"),
    description: t("manufacturers.metaDescription", { count: stats.manufacturers, industries: stats.industries, clusters: stats.clusters }),
    noIndex: filtered,
  });
}

export default async function ManufacturersPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const filters = parseSupplierFilters(sp);
  const [result, industries, provinces, clusters, certs, exportCountries] = await Promise.all([
    search().searchSuppliers(filters),
    getIndustriesWithCounts(),
    getProvincesWithSellers(),
    getClusters(),
    getCertifications(),
    getExportCountriesFacet(),
  ]);
  const path = "/manufacturers";
  const hasFilters = Object.keys(sp).some((k) => k !== "page" && k !== "sort" && sp[k]);
  const topIndustries = [...industries].filter((i) => i.supplierCount > 0).sort((a, b) => b.supplierCount - a.supplierCount);

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd([{ name: t("breadcrumbs.home"), path: "/" }, { name: t("breadcrumbs.manufacturers"), path }], locale)} />
      <PageHeader title={t("manufacturers.title")} description={t("manufacturers.subtitle")} breadcrumbs={[{ label: t("breadcrumbs.home"), href: "/" }, { label: t("breadcrumbs.manufacturers") }]} />

      {!hasFilters ? (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("manufacturers.browseByIndustry")}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {topIndustries.slice(0, 12).map((i) => (
                <IndustryTile key={i.id} compact href={`/manufacturers/${i.slug}`} name={localized(i as unknown as Record<string, unknown>, "name", locale)} icon={i.icon} countLabel={t("manufacturers.supplierCount", { count: i.supplierCount })} className="p-3" />
              ))}
            </div>
            {topIndustries.length > 12 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topIndustries.slice(12).map((i) => (
                  <ChipLink key={i.id} href={`/manufacturers/${i.slug}`} count={i.supplierCount}>
                    {localized(i as unknown as Record<string, unknown>, "name", locale)}
                  </ChipLink>
                ))}
              </div>
            ) : null}
          </section>
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("manufacturers.browseByCluster")}</h2>
            <div className="flex flex-wrap gap-2">
              {clusters.map((c) => (
                <ChipLink key={c.id} href={`/clusters/${c.slug}`} count={c.supplierCount}>
                  {localized(c as unknown as Record<string, unknown>, "name", locale)}
                </ChipLink>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SupplierFilters sp={sp} path={path} options={{ industries, provinces, certifications: certs, exportCountries }} />
        </aside>
        <div className="min-w-0">
          <SupplierListing result={result} sp={sp} path={path} locale={locale} columns={3} itemListName={t("manufacturers.title")} />
        </div>
      </div>
    </div>
  );
}

