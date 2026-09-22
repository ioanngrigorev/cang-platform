import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { SupplierListing } from "@/components/marketplace/product-listing";
import { SegmentIntro } from "@/components/marketplace/segment-stats";
import { SupplierFilters } from "@/components/marketplace/supplier-filters";
import { Button } from "@/components/ui/button";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { parseSupplierFilters, type SearchParams } from "@/modules/catalog/filters";
import { getCertifications, getExportCountriesFacet, getIndustriesForProvince, getIndustryBySlug, getProvinceBySlug, getProvincesForIndustry, getSegmentStats } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string; industrySlug: string; provinceSlug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale, industrySlug, provinceSlug }, sp] = await Promise.all([params, searchParams]);
  const [industry, province] = await Promise.all([getIndustryBySlug(industrySlug), getProvinceBySlug(provinceSlug)]);
  if (!industry || !province) return {};
  const [t, stats] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getSegmentStats({ industrySlug, provinceSlug })]);
  const industryName = localized(industry as unknown as Record<string, unknown>, "name", locale);
  const provinceName = localized(province as unknown as Record<string, unknown>, "name", locale);
  const filtered = Object.keys(sp).some((k) => k !== "page" && sp[k]);
  return pageMetadata({
    locale,
    path: `/manufacturers/${industry.slug}/${province.slug}`,
    title: t("manufacturers.industryProvinceTitle", { industry: industryName, province: provinceName }),
    description: t("manufacturers.industryProvinceMetaDescription", { industry: industryName, province: provinceName, count: stats.suppliers, verified: stats.verified, moq: stats.typicalMoq ?? "—", lead: stats.typicalLeadTimeDays ?? "—" }),
    // Thin pages (no inventory yet) stay out of the index but keep passing link equity.
    noIndex: filtered || stats.suppliers === 0,
  });
}

export default async function IndustryProvincePage({ params, searchParams }: Props) {
  const [{ locale, industrySlug, provinceSlug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [industry, province] = await Promise.all([getIndustryBySlug(industrySlug), getProvinceBySlug(provinceSlug)]);
  if (!industry || !province) notFound();
  const t = await getTranslations("marketplace");
  const industryName = localized(industry as unknown as Record<string, unknown>, "name", locale);
  const provinceName = localized(province as unknown as Record<string, unknown>, "name", locale);
  const path = `/manufacturers/${industry.slug}/${province.slug}`;
  const filters = parseSupplierFilters(sp, { industrySlug: industry.slug, provinceSlug: province.slug });
  const [result, stats, otherProvinces, otherIndustries, certs, exportCountries] = await Promise.all([
    search().searchSuppliers(filters),
    getSegmentStats({ industrySlug: industry.slug, provinceSlug: province.slug }),
    getProvincesForIndustry(industry.slug),
    getIndustriesForProvince(province.slug),
    getCertifications(),
    getExportCountriesFacet(),
  ]);
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.manufacturers"), href: "/manufacturers" },
    { label: industryName, href: `/manufacturers/${industry.slug}` },
    { label: provinceName },
  ];
  const siblingsProvinces = otherProvinces.filter((p) => p.id !== province.id);
  const siblingsIndustries = otherIndustries.filter((i) => i.id !== industry.id);

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: String(c.label), path: c.href ?? path })), locale)} />
      <PageHeader
        title={t("manufacturers.industryProvinceTitle", { industry: industryName, province: provinceName })}
        description={province.isIndustrialCluster ? localized(province as unknown as Record<string, unknown>, "clusterHeadline", locale) || t("manufacturers.subtitle") : t("manufacturers.subtitle")}
        breadcrumbs={crumbs}
        eyebrow={
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {provinceName}, Vietnam
          </span>
        }
        actions={
          province.isIndustrialCluster ? (
            <Button href={`/clusters/${province.slug}`} variant="secondary" size="sm">
              {t("clusters.viewCluster")} →
            </Button>
          ) : undefined
        }
      />
      <SegmentIntro stats={stats} className="mb-8" />

      {stats.suppliers === 0 ? (
        <div className="rounded-lg border border-dashed border-steel-300 bg-steel-50/50 p-8 text-center">
          <h2 className="text-lg font-semibold">{t("manufacturers.emptySegment")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-steel-600">{t("manufacturers.emptySegmentHint")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button href="/buyer/rfqs/new">{t("rfq.postYourRfq")}</Button>
            <Button href={`/manufacturers/${industry.slug}`} variant="secondary">
              {t("manufacturers.industryMetaTitle", { industry: industryName })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SupplierFilters sp={sp} path={path} options={{ certifications: certs, exportCountries }} />
          </aside>
          <div className="min-w-0">
            <SupplierListing result={result} sp={sp} path={path} locale={locale} columns={3} itemListName={t("manufacturers.industryProvinceTitle", { industry: industryName, province: provinceName })} />
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-8 border-t border-steel-200 pt-8 md:grid-cols-2">
        {siblingsProvinces.length ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">{t("manufacturers.otherProvincesFor", { industry: industryName })}</h2>
            <div className="flex flex-wrap gap-2">
              {siblingsProvinces.map((p) => (
                <ChipLink key={p.id} href={`/manufacturers/${industry.slug}/${p.slug}`} count={p.supplierCount}>
                  {localized(p as unknown as Record<string, unknown>, "name", locale)}
                </ChipLink>
              ))}
            </div>
          </section>
        ) : null}
        {siblingsIndustries.length ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">{t("manufacturers.otherIndustriesIn", { province: provinceName })}</h2>
            <div className="flex flex-wrap gap-2">
              {siblingsIndustries.map((i) => (
                <ChipLink key={i.id} href={`/manufacturers/${i.slug}/${province.slug}`} count={i.supplierCount}>
                  {localized(i as unknown as Record<string, unknown>, "name", locale)}
                </ChipLink>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <p className="mt-6 text-sm text-steel-500">
        <Link href={`/manufacturers/${industry.slug}`} className="font-medium text-ink-700 hover:underline">
          ← {t("manufacturers.industryMetaTitle", { industry: industryName })}
        </Link>
      </p>
    </div>
  );
}
