import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { ProductGrid, SupplierGrid } from "@/components/marketplace/grids";
import { SegmentIntro } from "@/components/marketplace/segment-stats";
import { ClusterCard, IndustryIcon } from "@/components/marketplace/tiles";
import { BannerImage } from "@/components/marketplace/banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Breadcrumbs, JsonLd, SectionHeading } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";
import { formatNumber, localized } from "@/lib/utils";
import { getClusters, getIndustriesForProvince, getIndustriesWithCounts, getProvinceBySlug, getSegmentStats } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string; provinceSlug: string }> };

const FACT_KEYS = ["industrialParks", "majorPort", "airport", "population", "specialty"] as const;

function regionKey(region: string | null): "north" | "central" | "south" {
  const r = (region ?? "").toLowerCase();
  if (r.startsWith("north")) return "north";
  if (r.startsWith("central")) return "central";
  return "south";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, provinceSlug } = await params;
  const province = await getProvinceBySlug(provinceSlug);
  if (!province) return {};
  const [t, industries] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getIndustriesForProvince(provinceSlug)]);
  const name = localized(province as unknown as Record<string, unknown>, "name", locale);
  const stats = await getSegmentStats({ provinceSlug });
  return pageMetadata({
    locale,
    path: `/clusters/${province.slug}`,
    title: province.seoTitle ?? t("clusters.clusterMetaTitle", { name }),
    description:
      province.seoDescription ??
      t("clusters.clusterMetaDescription", {
        headline: localized(province as unknown as Record<string, unknown>, "clusterHeadline", locale) || t("clusters.subtitle"),
        count: stats.suppliers,
        name,
        industries: industries
          .slice(0, 4)
          .map((i) => localized(i as unknown as Record<string, unknown>, "name", locale))
          .join(", "),
      }),
    image: province.heroImageUrl,
    noIndex: !province.isIndustrialCluster,
  });
}

export default async function ClusterPage({ params }: Props) {
  const { locale, provinceSlug } = await params;
  setRequestLocale(locale);
  const province = await getProvinceBySlug(provinceSlug);
  if (!province) notFound();
  const t = await getTranslations("marketplace");
  const name = localized(province as unknown as Record<string, unknown>, "name", locale);
  const path = `/clusters/${province.slug}`;

  const [stats, industries, suppliers, products, allClusters, allIndustries] = await Promise.all([
    getSegmentStats({ provinceSlug }),
    getIndustriesForProvince(provinceSlug),
    search().searchSuppliers({ provinceSlug, sort: "rating", pageSize: 6 }),
    search().searchProducts({ provinceSlug, sort: "popular", pageSize: 8 }),
    getClusters(),
    getIndustriesWithCounts(),
  ]);
  const industryName = new Map(allIndustries.map((i) => [i.slug, localized(i as unknown as Record<string, unknown>, "name", locale)]));

  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.clusters"), href: "/clusters" },
    { label: name },
  ];
  const headline = localized(province as unknown as Record<string, unknown>, "clusterHeadline", locale);
  const description = localized(province as unknown as Record<string, unknown>, "clusterDescription", locale);
  const facts = FACT_KEYS.map((k) => ({ key: k, value: province.keyFacts?.[k] })).filter((f) => f.value !== undefined && f.value !== null && f.value !== "");
  const others = allClusters.filter((c) => c.id !== province.id).slice(0, 3);

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("breadcrumbs.home"), path: "/" },
              { name: t("breadcrumbs.clusters"), path: "/clusters" },
              { name, path },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "Place",
            name: `${name}, Vietnam`,
            description: headline || description || undefined,
            url: `${siteUrl()}/${locale}${path}`,
            address: { "@type": "PostalAddress", addressRegion: name, addressCountry: "VN" },
          },
        ]}
      />

      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-ink-950 text-white">
        <div className="absolute inset-0 opacity-40" aria-hidden>
          {/* Decorative: empty alt so a failed load leaves no stray text over the hero. */}
          <BannerImage src={province.heroImageUrl} alt="" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/50" aria-hidden />
        <div className="container relative py-10 sm:py-14">
          <Breadcrumbs
            items={crumbs}
            className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200"
          />
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">
            <MapPin className="size-3.5" /> {t("clusters.region", { region: t(`clusters.${regionKey(province.region)}`) })}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{name}</h1>
          {headline ? <p className="mt-3 max-w-3xl text-base text-steel-200 sm:text-lg">{headline}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={`/manufacturers?province=${province.slug}`} variant="accent">
              {t("clusters.manufacturersIn", { name })}
            </Button>
            <Button href="/buyer/rfqs/new" variant="secondary">
              {t("rfq.postYourRfq")}
            </Button>
          </div>
          {facts.length ? (
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {facts.map((f) => (
                <div key={f.key} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-steel-400">{t(`clusters.facts.${f.key}`)}</dt>
                  <dd className="mt-0.5 font-display text-base font-bold text-white">{typeof f.value === "number" ? formatNumber(f.value, locale) : String(f.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </header>

      <div className="container py-8 sm:py-10">
        {description ? <p className="max-w-3xl text-sm leading-relaxed text-steel-700 sm:text-base">{description}</p> : null}
        <SegmentIntro stats={stats} className="mt-6" />

        {/* Industries */}
        {industries.length ? (
          <section className="mt-12">
            <SectionHeading title={t("clusters.majorIndustries")} />
            <div className="flex flex-wrap gap-2">
              {industries.map((i) => (
                <ChipLink key={i.id} href={`/manufacturers/${i.slug}/${province.slug}`} count={i.supplierCount}>
                  <IndustryIcon name={i.icon} className="size-4 text-steel-500" />
                  {localized(i as unknown as Record<string, unknown>, "name", locale)}
                </ChipLink>
              ))}
            </div>
          </section>
        ) : null}

        {/* Top suppliers */}
        <section className="mt-12">
          <SectionHeading
            title={t("clusters.topSuppliers", { name })}
            action={
              <Link href={`/manufacturers?province=${province.slug}`} className="inline-flex items-center gap-1 font-semibold text-ink-700 hover:text-ink-900">
                {t("clusters.manufacturersIn", { name })} <ArrowRight className="size-4" />
              </Link>
            }
          />
          {suppliers.hits.length ? (
            <SupplierGrid suppliers={suppliers.hits} columns={3} />
          ) : (
            <EmptyState
              icon={<MapPin />}
              title={t("clusters.noSuppliers")}
              action={<Button href="/manufacturers" variant="secondary" size="sm">{t("breadcrumbs.manufacturers")}</Button>}
            />
          )}
        </section>

        {/* Products */}
        {products.hits.length ? (
          <section className="mt-12">
            <SectionHeading
              title={t("clusters.productsFrom", { name })}
              action={
                <Link href={`/products?province=${province.slug}`} className="inline-flex items-center gap-1 font-semibold text-ink-700 hover:text-ink-900">
                  {t("breadcrumbs.products")} <ArrowRight className="size-4" />
                </Link>
              }
            />
            <ProductGrid products={products.hits} columns={4} />
          </section>
        ) : null}

        {/* Other clusters */}
        {others.length ? (
          <section className="mt-12 border-t border-steel-200 pt-8">
            <SectionHeading title={t("clusters.otherClusters")} action={<Link href="/clusters" className="font-semibold text-ink-700 hover:text-ink-900">{t("clusters.title")}</Link>} />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {others.map((c) => (
                <ClusterCard
                  key={c.id}
                  href={`/clusters/${c.slug}`}
                  name={localized(c as unknown as Record<string, unknown>, "name", locale)}
                  region={t(`clusters.${regionKey(c.region)}`)}
                  headline={localized(c as unknown as Record<string, unknown>, "clusterHeadline", locale) || null}
                  imageUrl={c.heroImageUrl}
                  supplierLabel={t("clusters.suppliersIn", { count: c.supplierCount })}
                  verifiedLabel={c.verifiedCount ? t("clusters.verifiedIn", { count: c.verifiedCount }) : undefined}
                  industries={c.majorIndustries.map((s) => industryName.get(s) ?? s)}
                  cta={t("clusters.viewCluster")}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
