import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContentArticle } from "@/components/marketplace/content-article";
import { Alert, Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { getPagesByType, getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getRenderedPage(slug, locale, "LEGAL");
  if (!page) return {};
  return pageMetadata({
    locale,
    path: `/legal/${page.slug}`,
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.excerpt ?? undefined,
    type: "article",
  });
}

export default async function LegalPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getRenderedPage(slug, locale, "LEGAL");
  if (!page) notFound();
  const t = await getTranslations("content");
  const others = (await getPagesByType("LEGAL", locale)).filter((p) => p.slug !== page.slug);
  const path = `/legal/${page.slug}`;

  return (
    <ContentArticle
      eyebrow={t("legal.eyebrow")}
      title={page.title}
      excerpt={page.excerpt}
      html={page.html}
      toc={page.toc}
      tocTitle={t("common.onThisPage")}
      readingLabel={t("common.lastUpdated", { date: formatDate(page.updatedAt, locale) })}
      breadcrumbs={[
        { label: t("common.home"), href: "/" },
        { label: t("legal.title"), href: "/help" },
        { label: page.title },
      ]}
      before={
        <JsonLd
          data={breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("legal.title"), path: "/help" },
              { name: page.title, path },
            ],
            locale,
          )}
        />
      }
      aside={
        <>
          {others.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">
                  <Scale className="size-3.5" /> {t("legal.allDocuments")}
                </p>
                <ul className="space-y-2 text-sm">
                  {others.map((p) => (
                    <li key={p.id}>
                      <Link href={`/legal/${p.slug}`} className="font-medium text-ink-800 hover:text-ink-950 hover:underline">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <Alert variant="info">{t("legal.notice")}</Alert>
        </>
      }
    />
  );
}
