import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContentArticle } from "@/components/marketplace/content-article";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";
import { formatDate, truncate } from "@/lib/utils";
import { getPagesByType, getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getRenderedPage(slug, locale, "GUIDE");
  if (!page) return {};
  return pageMetadata({
    locale,
    path: `/guides/${page.slug}`,
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.excerpt ?? undefined,
    image: page.coverImageUrl,
    type: "article",
  });
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getRenderedPage(slug, locale, "GUIDE");
  if (!page) notFound();
  const t = await getTranslations("content");
  const others = (await getPagesByType("GUIDE", locale)).filter((g) => g.slug !== page.slug).slice(0, 4);
  const path = `/guides/${page.slug}`;

  return (
    <ContentArticle
      eyebrow={t("guides.eyebrow")}
      title={page.title}
      excerpt={page.excerpt}
      html={page.html}
      toc={page.toc}
      tocTitle={t("common.onThisPage")}
      readingLabel={t("common.readingTime", { minutes: page.readingMinutes })}
      breadcrumbs={[
        { label: t("common.home"), href: "/" },
        { label: t("guides.title"), href: "/guides" },
        { label: page.title },
      ]}
      before={
        <JsonLd
          data={[
            breadcrumbJsonLd(
              [
                { name: t("common.home"), path: "/" },
                { name: t("guides.title"), path: "/guides" },
                { name: page.title, path },
              ],
              locale,
            ),
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: page.title,
              description: page.excerpt ?? undefined,
              image: page.coverImageUrl ?? undefined,
              datePublished: page.publishedAt?.toISOString(),
              dateModified: page.updatedAt.toISOString(),
              inLanguage: locale,
              mainEntityOfPage: `${siteUrl()}/${locale}${path}`,
              author: { "@type": "Organization", name: "CANG" },
              publisher: { "@type": "Organization", name: "CANG", logo: { "@type": "ImageObject", url: `${siteUrl()}/logo.svg` } },
            },
          ]}
        />
      }
      aside={
        <>
          {others.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("guides.moreGuides")}</p>
                <ul className="space-y-2.5 text-sm">
                  {others.map((g) => (
                    <li key={g.id}>
                      <Link href={`/guides/${g.slug}`} className="font-medium text-ink-800 hover:text-ink-950 hover:underline">
                        {g.title}
                      </Link>
                      {g.excerpt ? <p className="mt-0.5 text-xs text-steel-500">{truncate(g.excerpt, 90)}</p> : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-ink-900">{t("guides.cta")}</p>
              <p className="mt-1 text-sm text-steel-600">{t("guides.ctaBody")}</p>
              <Button href="/buyer/rfqs/new" size="sm" className="mt-3 w-full">
                {t("common.postRfq")}
              </Button>
              <Button href="/manufacturers" variant="secondary" size="sm" className="mt-2 w-full">
                {t("common.browseManufacturers")}
              </Button>
            </CardContent>
          </Card>
          {page.updatedAt ? <p className="text-xs text-steel-500">{t("common.lastUpdated", { date: formatDate(page.updatedAt, locale) })}</p> : null}
        </>
      }
      after={
        <p className="mt-10 border-t border-steel-200 pt-6 text-sm">
          <Link href="/guides" className="font-medium text-ink-700 hover:underline">
            ← {t("common.backTo", { name: t("guides.title") })}
          </Link>
        </p>
      }
    />
  );
}
