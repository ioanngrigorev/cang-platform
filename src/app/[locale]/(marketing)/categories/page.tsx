import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SmartImage } from "@/components/ui/smart-image";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { formatNumber, localized } from "@/lib/utils";
import { getCategoryTree, getPlatformStats } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, stats] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getPlatformStats()]);
  return pageMetadata({ locale, path: "/categories", title: t("categories.metaTitle"), description: t("categories.metaDescription", { count: stats.products }) });
}

/** Every product category with its sub-categories — the target of "All categories". */
export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tree] = await Promise.all([getTranslations("marketplace"), getCategoryTree()]);
  const name = (c: Record<string, unknown>) => localized(c, "name", locale);
  const sorted = [...tree].sort((a, b) => b.productCount - a.productCount || a.sortOrder - b.sortOrder);

  return (
    <div className="container py-8">
      <JsonLd data={breadcrumbJsonLd([{ name: t("breadcrumbs.home"), path: "/" }, { name: t("categories.title"), path: "/categories" }], locale)} />
      <PageHeader title={t("categories.title")} description={t("categories.subtitle", { count: tree.length })} breadcrumbs={[{ label: t("breadcrumbs.home"), href: "/" }, { label: t("categories.title") }]} />

      <nav aria-label={t("categories.jumpTo")} className="mb-8 flex flex-wrap gap-2">
        {sorted.map((c) => (
          <a key={c.id} href={`#${c.slug}`} className="rounded-full border border-steel-200 bg-white px-3 py-1 text-sm text-steel-700 hover:border-steel-400 hover:text-ink-900">
            {name(c as unknown as Record<string, unknown>)}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c) => {
          const cName = name(c as unknown as Record<string, unknown>);
          const children = c.children.filter((ch) => ch.productCount > 0 || c.children.length <= 12);
          return (
            <section key={c.id} id={c.slug} className="scroll-mt-24 overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card">
              <Link href={`/products/${c.slug}`} className="group flex items-center gap-4 border-b border-steel-100 p-4 hover:bg-steel-50">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-steel-100">
                  <SmartImage src={c.imageUrl ?? undefined} alt={cName} fill photo={c.name} fallbackLabel={cName} sizes="64px" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-ink-900 group-hover:underline">{cName}</h2>
                  <p className="text-xs text-steel-500">{t("categories.products", { count: c.productCount })}</p>
                </div>
              </Link>
              {children.length ? (
                <ul className="grid grid-cols-1 gap-x-4 p-4 text-sm sm:grid-cols-2">
                  {children.map((ch) => (
                    <li key={ch.id}>
                      <Link href={`/products/${c.slug}?sub=${ch.slug}`} className="flex items-baseline justify-between gap-2 py-1 text-steel-700 hover:text-ink-900 hover:underline">
                        <span className="truncate">{name(ch as unknown as Record<string, unknown>)}</span>
                        {ch.productCount ? <span className="shrink-0 text-xs text-steel-400">{formatNumber(ch.productCount, locale)}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="px-4 pb-4">
                <Link href={`/products/${c.slug}`} className="text-sm font-medium text-jade-600 hover:text-jade-700">
                  {t("categories.viewAll", { name: cName })} →
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
