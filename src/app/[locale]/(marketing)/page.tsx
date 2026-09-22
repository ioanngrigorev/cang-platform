import * as React from "react";
import { ArrowRight, BookOpen, Landmark, Search as SearchIcon, ShieldCheck, Ship, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchBar } from "@/components/layout/search-bar";
import { BannerImage } from "@/components/marketplace/banner";
import { ProductGrid, SupplierGrid } from "@/components/marketplace/grids";
import { IconCard, Section, SectionTitle, StatTile, Step } from "@/components/marketplace/section";
import { CategoryTile, IndustryTile } from "@/components/marketplace/tiles";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { formatNumber, localized, truncate } from "@/lib/utils";
import {
  getFeaturedCategories,
  getFeaturedVerifiedSuppliers,
  getIndustriesWithCounts,
  getNewSuppliers,
  getPlatformStats,
  getTrendingProducts,
} from "@/modules/catalog/queries";
import { getActiveBanners, getHomepageSections, getPagesByType, type Banner, type HomepageSection } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return pageMetadata({ locale, path: "/", title: t("meta.title"), description: t("meta.description") });
}

const HERO_CHIPS = [
  { key: "garments", q: "garments" },
  { key: "furniture", q: "furniture" },
  { key: "electronics", q: "electronics" },
  { key: "machinery", q: "machinery" },
  { key: "packaging", q: "packaging" },
  { key: "footwear", q: "footwear" },
] as const;

function limitOf(section: HomepageSection, fallback: number) {
  const v = section.config?.limit;
  return typeof v === "number" && v > 0 ? Math.min(v, 24) : fallback;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, sections, stats, heroBanners, secondaryBanners] = await Promise.all([
    getTranslations("home"),
    getHomepageSections(),
    getPlatformStats(),
    getActiveBanners("HOMEPAGE_HERO", locale),
    getActiveBanners("HOMEPAGE_SECONDARY", locale),
  ]);
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const has = (k: string) => byKey.has(k);

  // Fetch only what the active sections need, in parallel.
  const [categories, verified, industries, trending, fresh, guides] = await Promise.all([
    has("TOP_CATEGORIES") ? getFeaturedCategories(limitOf(byKey.get("TOP_CATEGORIES")!, 12)) : [],
    has("VERIFIED_MANUFACTURERS") ? getFeaturedVerifiedSuppliers(limitOf(byKey.get("VERIFIED_MANUFACTURERS")!, 8)) : [],
    has("MADE_IN_VIETNAM") ? getIndustriesWithCounts() : [],
    has("TRENDING_PRODUCTS") ? getTrendingProducts(limitOf(byKey.get("TRENDING_PRODUCTS")!, 12)) : [],
    has("NEW_SUPPLIERS") ? getNewSuppliers(limitOf(byKey.get("NEW_SUPPLIERS")!, 8)) : [],
    has("GUIDES") ? getPagesByType("GUIDE", locale) : [],
  ]);
  // CMS banners with `locale: null` apply to every locale but are authored in English,
  // so outside English we fall back to the translated copy in `home.banner.*`.
  const localizeBanner = (b: Banner | null, key: "hero" | "secondary"): Banner | null =>
    b && b.locale === null && locale !== "en"
      ? { ...b, title: t(`banner.${key}.title`), subtitle: t(`banner.${key}.subtitle`), ctaLabel: t(`banner.${key}.cta`) }
      : b;
  const heroBanner = localizeBanner(heroBanners[0] ?? null, "hero");
  const secondaryBanner = localizeBanner(secondaryBanners[0] ?? null, "secondary");

  let tone: "white" | "steel" = "white";
  const nextTone = () => {
    const current = tone;
    tone = tone === "white" ? "steel" : "white";
    return current;
  };
  const title = (s: HomepageSection) => localized(s as unknown as Record<string, unknown>, "title", locale);
  const subtitle = (s: HomepageSection) => localized(s as unknown as Record<string, unknown>, "subtitle", locale) || undefined;

  // The secondary banner slots in after the first product-heavy section.
  const bannerAfter = sections.find((s) => s.key === "TRENDING_PRODUCTS")?.key ?? sections[Math.min(2, sections.length - 1)]?.key;

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(locale)]} />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black_40%,transparent_80%)]" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-brass-500/10 blur-3xl" aria-hidden />
        <div className="container relative grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-300">{t("hero.eyebrow")}</p>
            <h1 className="mt-4 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">{t("hero.title")}</h1>
            <p className="mt-5 max-w-xl text-base text-steel-300 sm:text-lg">{t("hero.subtitle")}</p>
            <div className="mt-8 max-w-2xl">
              <SearchBar size="lg" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-steel-400">{t("hero.tryLabel")}:</span>
              {HERO_CHIPS.map((c) => (
                <Link key={c.key} href={`/search?q=${encodeURIComponent(c.q)}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-steel-200 transition-colors hover:border-brass-400/60 hover:bg-white/10 hover:text-white">
                  {t(`hero.chips.${c.key}`)}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/buyer/rfqs/new" variant="accent" size="lg">
                {t("hero.postRfq")}
                <ArrowRight />
              </Button>
              <Button href="/manufacturers" variant="secondary" size="lg" className="border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10">
                {t("hero.browseManufacturers")}
              </Button>
            </div>
          </div>
          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 opacity-25">
                <BannerImage src={heroBanner?.imageUrl} alt="" />
              </div>
              <div className="relative flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">{t("hero.howItWorks")}</p>
                <ol className="mt-5 space-y-5">
                  <Step index={1} dark title={t("postRfq.step1Title")} body={t("postRfq.step1Body")} />
                  <Step index={2} dark title={t("postRfq.step2Title")} body={t("postRfq.step2Body")} />
                  <Step index={3} dark title={t("postRfq.step3Title")} body={t("postRfq.step3Body")} />
                </ol>
                {heroBanner ? (
                  <div className="mt-auto border-t border-white/10 pt-5">
                    <p className="font-display text-lg font-semibold text-white">{heroBanner.title}</p>
                    {heroBanner.subtitle ? <p className="mt-1 text-sm text-steel-300">{heroBanner.subtitle}</p> : null}
                    {heroBanner.ctaUrl ? (
                      <Link href={heroBanner.ctaUrl} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brass-300 hover:text-brass-200">
                        {heroBanner.ctaLabel ?? t("banner.learnMore")} <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="relative border-t border-white/10 bg-ink-950/60">
          <dl className="container grid grid-cols-2 divide-white/10 py-6 sm:grid-cols-4 sm:divide-x">
            {[
              { v: stats.verifiedManufacturers, l: t("stats.verifiedManufacturers") },
              { v: stats.products, l: t("stats.products") },
              { v: stats.clusters, l: t("stats.clusters") },
              { v: stats.countriesServed, l: t("stats.countries") },
            ].map((s, i) => (
              <div key={i} className="px-2 py-2 text-center sm:px-6">
                <dd className="font-display text-3xl font-bold tabular-nums text-white">{formatNumber(s.v, locale)}</dd>
                <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-steel-400">{s.l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- Admin-composed sections ---------------- */}
      {sections.map((section) => {
        let node: React.ReactNode = null;
        switch (section.key) {
          case "TOP_CATEGORIES":
            node = categories.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section)} action={{ label: t("sections.allCategories"), href: "/products" }} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {categories.map((c) => (
                    <CategoryTile key={c.id} href={`/products/${c.slug}`} name={localized(c as unknown as Record<string, unknown>, "name", locale)} imageUrl={c.imageUrl} countLabel={t("sections.productsCount", { count: c.productCount })} />
                  ))}
                </div>
              </Section>
            ) : null;
            break;
          case "VERIFIED_MANUFACTURERS":
            node = verified.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section)} action={{ label: t("sections.allManufacturers"), href: "/manufacturers?verified=1" }} />
                <SupplierGrid suppliers={verified} columns={4} />
              </Section>
            ) : null;
            break;
          case "MADE_IN_VIETNAM": {
            const limit = limitOf(section, 6);
            const top = [...industries].sort((a, b) => b.supplierCount - a.supplierCount).slice(0, limit);
            node = top.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("sections.madeInVietnamSubtitle")} action={{ label: t("sections.allManufacturers"), href: "/manufacturers" }} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {top.map((i) => (
                    <IndustryTile
                      key={i.id}
                      href={`/manufacturers/${i.slug}`}
                      name={localized(i as unknown as Record<string, unknown>, "name", locale)}
                      icon={i.icon}
                      countLabel={`${t("sections.suppliersCount", { count: i.supplierCount })} · ${t("sections.verifiedCount", { count: i.verifiedCount })}`}
                      description={localized(i as unknown as Record<string, unknown>, "description", locale)}
                    />
                  ))}
                </div>
              </Section>
            ) : null;
            break;
          }
          case "TRENDING_PRODUCTS":
            node = trending.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("sections.trendingSubtitle")} action={{ label: t("sections.allProducts"), href: "/products?sort=popular" }} />
                <ProductGrid products={trending} columns={6} compact />
              </Section>
            ) : null;
            break;
          case "POST_RFQ":
            node = (
              <Section key={section.id} tone="ink" className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden />
                <div className="relative grid gap-10 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">{t("postRfq.eyebrow")}</p>
                    <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title(section)}</h2>
                    <p className="mt-4 text-steel-300">{subtitle(section) ?? t("postRfq.subtitle")}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button href="/buyer/rfqs/new" variant="accent" size="lg">
                        {t("postRfq.cta")} <ArrowRight />
                      </Button>
                      <Button href="/rfq" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
                        {t("postRfq.browse")}
                      </Button>
                    </div>
                    <p className="mt-4 text-sm text-steel-400">{t("postRfq.openRfqs", { count: stats.openRfqs })}</p>
                  </div>
                  <ol className="grid gap-6 lg:col-span-7 lg:grid-cols-1">
                    <Step index={1} dark title={t("postRfq.step1Title")} body={t("postRfq.step1Body")} />
                    <Step index={2} dark title={t("postRfq.step2Title")} body={t("postRfq.step2Body")} />
                    <Step index={3} dark title={t("postRfq.step3Title")} body={t("postRfq.step3Body")} />
                  </ol>
                </div>
              </Section>
            );
            break;
          case "NEW_SUPPLIERS":
            node = fresh.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("sections.newSuppliersSubtitle")} action={{ label: t("sections.allManufacturers"), href: "/manufacturers?sort=newest" }} />
                <SupplierGrid suppliers={fresh} columns={4} />
              </Section>
            ) : null;
            break;
          case "WHY_VIETNAM":
            node = (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("whyVietnam.subtitle")} action={{ label: t("whyVietnam.cta"), href: "/why-vietnam" }} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(["fta", "cost", "workforce", "sectors"] as const).map((k) => (
                    <StatTile key={k} value={t(`whyVietnam.${k}.value`)} label={t(`whyVietnam.${k}.label`)} hint={t(`whyVietnam.${k}.body`)} />
                  ))}
                </div>
              </Section>
            );
            break;
          case "TRADE_ASSURANCE":
            node = (
              <Section key={section.id} tone={nextTone()}>
                <div className="grid items-center gap-10 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-600">{t("tradeAssurance.eyebrow")}</p>
                    <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{title(section)}</h2>
                    <p className="mt-4 text-steel-600">{subtitle(section) ?? t("tradeAssurance.body")}</p>
                    <Button href="/trade-assurance" variant="primary" className="mt-6">
                      {t("tradeAssurance.cta")} <ArrowRight />
                    </Button>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-6">
                    {(["point1", "point2", "point3", "point4"] as const).map((k) => (
                      <li key={k} className="flex items-start gap-3 rounded-lg border border-steel-200 bg-white p-4 shadow-card">
                        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-600" />
                        <span className="text-sm font-medium text-ink-900">{t(`tradeAssurance.${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            );
            break;
          case "SERVICES":
            node = (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("services.subtitle")} />
                <div className="grid gap-5 md:grid-cols-3">
                  <IconCard icon={<Ship />} title={t("services.logistics.title")} body={t("services.logistics.body")} href="/logistics" cta={t("services.learnMore")} />
                  <IconCard icon={<ClipboardCheck />} title={t("services.inspection.title")} body={t("services.inspection.body")} href="/inspection" cta={t("services.learnMore")} />
                  <IconCard icon={<Landmark />} title={t("services.financing.title")} body={t("services.financing.body")} href="/financing" cta={t("services.learnMore")} />
                </div>
              </Section>
            );
            break;
          case "GUIDES":
            node = guides.length ? (
              <Section key={section.id} tone={nextTone()}>
                <SectionTitle title={title(section)} subtitle={subtitle(section) ?? t("guides.subtitle")} action={{ label: t("sections.allGuides"), href: "/guides" }} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {guides.slice(0, 4).map((g) => (
                    <Link key={g.id} href={`/guides/${g.slug}`} className="group flex flex-col rounded-lg border border-steel-200 bg-white p-5 shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover">
                      <BookOpen className="size-5 text-brass-600" />
                      <h3 className="mt-3 text-base font-semibold group-hover:underline">{g.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-steel-600">{truncate(g.excerpt, 140)}</p>
                      <span className="mt-auto pt-4 text-sm font-semibold text-ink-700">
                        {t("guides.read")} <ArrowRight className="inline size-4" />
                      </span>
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null;
            break;
          default:
            node = null;
        }
        if (section.key === bannerAfter && secondaryBanner) {
          return (
            <React.Fragment key={section.id}>
              {node}
              <div className={tone === "white" ? "bg-white" : "bg-steel-50"}>
                <div className="container pb-12 sm:pb-16">
                  <div className="relative overflow-hidden rounded-xl border border-ink-800 bg-ink-900 text-white">
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-30 lg:block">
                      <BannerImage src={secondaryBanner.imageUrl} alt="" />
                      <div className="absolute inset-0 bg-gradient-to-r from-ink-900 to-transparent" />
                    </div>
                    <div className="relative flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                      <div className="max-w-xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">CANG</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">{secondaryBanner.title}</h2>
                        {secondaryBanner.subtitle ? <p className="mt-2 text-steel-300">{secondaryBanner.subtitle}</p> : null}
                      </div>
                      {secondaryBanner.ctaUrl ? (
                        <Button href={secondaryBanner.ctaUrl} variant="accent" size="lg" className="shrink-0">
                          {secondaryBanner.ctaLabel ?? t("banner.learnMore")} <ArrowRight />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        }
        return node;
      })}

      {sections.length === 0 ? (
        <Section tone="white">
          <div className="mx-auto max-w-xl text-center">
            <SearchIcon className="mx-auto size-8 text-steel-400" />
            <p className="mt-3 text-steel-600">{t("sections.empty")}</p>
          </div>
        </Section>
      ) : null}
    </>
  );
}
