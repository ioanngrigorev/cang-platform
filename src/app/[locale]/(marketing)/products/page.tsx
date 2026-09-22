import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { ProductFilters } from "@/components/marketplace/product-filters";
import { ProductListing } from "@/components/marketplace/product-listing";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { first, parseProductFilters, type SearchParams } from "@/modules/catalog/filters";
import { getCertifications, getPlatformStats, getProvincesWithSellers, getRootCategories } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const [t, stats] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getPlatformStats()]);
  const filtered = Object.keys(sp).some((k) => k !== "page" && sp[k]);
  return pageMetadata({
    locale,
    path: "/products",
    title: t("products.metaTitle"),
    description: t("products.metaDescription", { count: stats.products, categories: 20 }),
    noIndex: filtered,
  });
}

export default async function ProductsHubPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const category = first(sp.category);
  const filters = parseProductFilters(sp, category ? { categorySlug: category } : {});
  const [result, roots, provinces, certs] = await Promise.all([search().searchProducts(filters), getRootCategories(), getProvincesWithSellers(), getCertifications()]);
  const path = "/products";

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd([{ name: t("breadcrumbs.home"), path: "/" }, { name: t("breadcrumbs.products"), path }], locale)} />
      <PageHeader title={t("products.title")} description={t("products.subtitle")} breadcrumbs={[{ label: t("breadcrumbs.home"), href: "/" }, { label: t("breadcrumbs.products") }]} />

      <section aria-label={t("products.browseByCategory")} className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("products.browseByCategory")}</h2>
        <div className="flex flex-wrap gap-2">
          <ChipLink href={path} active={!category}>
            {t("listing.all")}
          </ChipLink>
          {roots.map((c) => (
            <ChipLink key={c.id} href={`/products/${c.slug}`} active={category === c.slug} count={c.productCount || undefined}>
              {localized(c as unknown as Record<string, unknown>, "name", locale)}
            </ChipLink>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ProductFilters sp={sp} path={path} options={{ provinces, certifications: certs, categories: roots, categoryParam: "category" }} />
        </aside>
        <div className="min-w-0">
          <ProductListing result={result} sp={sp} path={path} locale={locale} itemListName={t("products.title")} />
        </div>
      </div>
    </div>
  );
}
