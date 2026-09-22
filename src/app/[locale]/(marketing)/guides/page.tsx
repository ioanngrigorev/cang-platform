import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";
import { getPagesByType } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/guides", title: t("guides.metaTitle"), description: t("guides.metaDescription") });
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tm, guides] = await Promise.all([getTranslations("content"), getTranslations("marketplace"), getPagesByType("GUIDE", locale)]);
  const crumbs = [
    { label: t("common.home"), href: "/" },
    { label: t("guides.title") },
  ];

  return (
    <div className="container py-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("guides.title"), path: "/guides" },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("guides.metaTitle"),
            numberOfItems: guides.length,
            itemListElement: guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: `${siteUrl()}/${locale}/guides/${g.slug}` })),
          },
        ]}
      />
      <PageHeader title={t("guides.title")} description={t("guides.subtitle")} breadcrumbs={crumbs} eyebrow={t("guides.eyebrow")} />

      {guides.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((g) => (
            <article key={g.id} className="group flex flex-col overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover">
              <Link href={`/guides/${g.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-steel-100">
                <SmartImage src={g.coverImageUrl ?? undefined} alt={g.title} fill fallbackLabel={g.title} className="transition-transform duration-300 group-hover:scale-[1.03]" />
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass-600">{t("guides.eyebrow")}</p>
                <h2 className="mt-1.5 text-base font-semibold text-ink-900">
                  <Link href={`/guides/${g.slug}`} className="hover:underline">
                    {g.title}
                  </Link>
                </h2>
                {g.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-steel-600">{truncate(g.excerpt, 180)}</p> : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <Link href={`/guides/${g.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-900">
                    {t("guides.read")} <ArrowRight className="size-4" />
                  </Link>
                  {g.publishedAt ? <span className="text-xs text-steel-500">{formatDate(g.publishedAt, locale)}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BookOpen />} title={t("guides.empty")} action={<Button href="/why-vietnam" variant="secondary" size="sm">{t("whyVietnam.title")}</Button>} />
      )}

      <section className="mt-12 rounded-lg bg-ink-900 px-6 py-8 text-white sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold sm:text-2xl text-white">{t("guides.cta")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("guides.ctaBody")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href="/buyer/rfqs/new" variant="accent">
              {t("common.postRfq")}
            </Button>
            <Button href="/manufacturers" variant="secondary">
              {tm("breadcrumbs.manufacturers")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
