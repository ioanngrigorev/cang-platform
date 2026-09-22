import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { ProductFilters } from "@/components/marketplace/product-filters";
import { ProductListing } from "@/components/marketplace/product-listing";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { first, parseProductFilters, type SearchParams } from "@/modules/catalog/filters";
import { getCategoryBySlug, getCertifications, getProvincesWithSellers, getRootCategories } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";
import { search } from "@/modules/search";

type Props = { params: Promise<{ locale: string; categorySlug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale, categorySlug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const name = localized(category as unknown as Record<string, unknown>, "name", locale);
  const filtered = Object.keys(sp).some((k) => k !== "page" && k !== "sub" && sp[k]);
  return pageMetadata({
    locale,
    path: `/products/${category.slug}`,
    title: category.seoTitle ?? t("products.categoryMetaTitle", { name }),
    description: category.seoDescription ?? t("products.categoryMetaDescription", { name, count: category.productCount }),
    image: category.imageUrl,
    noIndex: filtered,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ locale, categorySlug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();
  const t = await getTranslations("marketplace");
  const name = localized(category as unknown as Record<string, unknown>, "name", locale);
  const sub = first(sp.sub);
  const subCategory = sub ? category.children.find((c) => c.slug === sub) ?? null : null;
  const filters = parseProductFilters(sp, { categorySlug: subCategory?.slug ?? category.slug });
  const path = `/products/${category.slug}`;
  const [result, provinces, certs, siblings] = await Promise.all([search().searchProducts(filters), getProvincesWithSellers(), getCertifications(), category.parent ? getCategoryBySlug(category.parent.slug).then((p) => p?.children ?? []) : getRootCategories()]);

  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.products"), href: "/products" },
    ...(category.parent ? [{ label: localized(category.parent as unknown as Record<string, unknown>, "name", locale), href: `/products/${category.parent.slug}` }] : []),
    { label: name, href: path },
    ...(subCategory ? [{ label: localized(subCategory as unknown as Record<string, unknown>, "name", locale) }] : []),
  ];
  const description = localized(category as unknown as Record<string, unknown>, "description", locale) || t("products.subtitle");
  const related = siblings.filter((s) => s.id !== category.id).slice(0, 8);

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: String(c.label), path: c.href ?? path })), locale)} />
      <PageHeader
        title={subCategory ? localized(subCategory as unknown as Record<string, unknown>, "name", locale) : name}
        description={description}
        breadcrumbs={crumbs}
        eyebrow={subCategory ? t("products.inCategory", { name }) : category.industry ? localized(category.industry as unknown as Record<string, unknown>, "name", locale) : undefined}
      />

      {category.children.length ? (
        <section aria-label={t("products.subcategories")} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("products.subcategories")}</h2>
          <div className="flex flex-wrap gap-2">
            <ChipLink href={path} active={!subCategory}>
              {t("products.allIn", { name })}
            </ChipLink>
            {category.children.map((c) => (
              <ChipLink key={c.id} href={`${path}?sub=${c.slug}`} active={subCategory?.id === c.id} count={c.productCount || undefined}>
                {localized(c as unknown as Record<string, unknown>, "name", locale)}
              </ChipLink>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ProductFilters sp={sp} path={path} options={{ provinces, certifications: certs, categories: category.children, categoryParam: "sub" }} />
        </aside>
        <div className="min-w-0">
          <ProductListing result={result} sp={sp} path={path} locale={locale} itemListName={t("products.categoryMetaTitle", { name })} />
        </div>
      </div>

      {related.length ? (
        <section className="mt-12 border-t border-steel-200 pt-8">
          <h2 className="mb-3 text-lg font-semibold">{t("products.relatedCategories")}</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((c) => (
              <Link key={c.id} href={`/products/${c.slug}`} className="rounded-full border border-steel-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 hover:border-steel-400 hover:bg-steel-50">
                {localized(c as unknown as Record<string, unknown>, "name", locale)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
