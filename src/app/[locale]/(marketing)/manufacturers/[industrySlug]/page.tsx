import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { SupplierListing } from "@/components/marketplace/product-listing";
import { SegmentIntro } from "@/components/marketplace/segment-stats";
import { SupplierFilters } from "@/components/marketplace/supplier-filters";
import { IndustryIcon } from "@/components/marketplace/tiles";
import { Button } from "@/components/ui/button";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { parseSupplierFilters, type SearchParams } from "@/modules/catalog/filters";
import { getCertifications, getExportCountriesFacet, getIndustriesWithCounts, getIndustryBySlug, getProvincesForIndustry, getSegmentStats } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string; industrySlug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale, industrySlug }, sp] = await Promise.all([params, searchParams]);
  const industry = await getIndustryBySlug(industrySlug);
  if (!industry) return {};
  const [t, stats] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getSegmentStats({ industrySlug })]);
  const name = localized(industry as unknown as Record<string, unknown>, "name", locale);
  const filtered = Object.keys(sp).some((k) => k !== "page" && sp[k]);
  return pageMetadata({
    locale,
    path: `/manufacturers/${industry.slug}`,
    title: t("manufacturers.industryMetaTitle", { industry: name }),
    description: t("manufacturers.industryMetaDescription", { industry: name, count: stats.suppliers, verified: stats.verified }),
    noIndex: filtered || stats.suppliers === 0,
  });
}

export default async function IndustryPage({ params, searchParams }: Props) {
  const [{ locale, industrySlug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const industry = await getIndustryBySlug(industrySlug);
  if (!industry) notFound();
  const t = await getTranslations("marketplace");
  const name = localized(industry as unknown as Record<string, unknown>, "name", locale);
  const path = `/manufacturers/${industry.slug}`;
  const filters = parseSupplierFilters(sp, { industrySlug: industry.slug });
  const [result, stats, provinces, industries, certs, exportCountries] = await Promise.all([
    search().searchSuppliers(filters),
    getSegmentStats({ industrySlug: industry.slug }),
    getProvincesForIndustry(industry.slug),
    getIndustriesWithCounts(),
    getCertifications(),
    getExportCountriesFacet(),
  ]);
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.manufacturers"), href: "/manufacturers" },
    { label: name },
  ];
  const otherIndustries = industries.filter((i) => i.id !== industry.id && i.supplierCount > 0).slice(0, 10);

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: String(c.label), path: c.href ?? path })), locale)} />
      <PageHeader
        title={t("manufacturers.industryMetaTitle", { industry: name })}
        description={localized(industry as unknown as Record<string, unknown>, "description", locale) || t("manufacturers.subtitle")}
        breadcrumbs={crumbs}
        actions={
          <span className="hidden size-12 items-center justify-center rounded-md bg-ink-50 text-ink-800 sm:inline-flex">
            <IndustryIcon name={industry.icon} className="size-6" />
          </span>
        }
      />
      <SegmentIntro stats={stats} className="mb-8" />

      {provinces.length ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("manufacturers.topProvinces", { industry: name })}</h2>
          <div className="flex flex-wrap gap-2">
            {provinces.map((p) => (
              <ChipLink key={p.id} href={`${path}/${p.slug}`} count={p.supplierCount}>
                {localized(p as unknown as Record<string, unknown>, "name", locale)}
              </ChipLink>
            ))}
          </div>
        </section>
      ) : null}

      {stats.suppliers === 0 ? (
        <div className="rounded-lg border border-dashed border-steel-300 bg-steel-50/50 p-8 text-center">
          <h2 className="text-lg font-semibold">{t("manufacturers.emptySegment")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-steel-600">{t("manufacturers.emptySegmentHint")}</p>
          <Button href="/buyer/rfqs/new" className="mt-4">
            {t("rfq.postYourRfq")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SupplierFilters sp={sp} path={path} options={{ provinces, certifications: certs, exportCountries }} />
          </aside>
          <div className="min-w-0">
            <SupplierListing result={result} sp={sp} path={path} locale={locale} columns={3} itemListName={t("manufacturers.industryMetaTitle", { industry: name })} />
          </div>
        </div>
      )}

      {otherIndustries.length ? (
        <section className="mt-12 border-t border-steel-200 pt-8">
          <h2 className="mb-3 text-lg font-semibold">{t("manufacturers.allIndustries")}</h2>
          <div className="flex flex-wrap gap-2">
            {otherIndustries.map((i) => (
              <ChipLink key={i.id} href={`/manufacturers/${i.slug}`} count={i.supplierCount}>
                {localized(i as unknown as Record<string, unknown>, "name", locale)}
              </ChipLink>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
