import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentArticle } from "@/components/marketplace/content-article";
import { StatTile } from "@/components/marketplace/section";
import { SupplierCta } from "@/components/marketplace/supplier-cta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/ui/misc";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { formatNumber } from "@/lib/utils";
import { getPlatformStats } from "@/modules/catalog/queries";
import { getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "content" }), getRenderedPage("about", locale, "PAGE")]);
  return pageMetadata({
    locale,
    path: "/about",
    title: page?.seoTitle ?? page?.title ?? t("about.eyebrow"),
    description: page?.seoDescription ?? page?.excerpt ?? t("about.metaDescription"),
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, page, stats] = await Promise.all([getTranslations("content"), getRenderedPage("about", locale, "PAGE"), getPlatformStats()]);
  const title = page?.title ?? t("about.eyebrow");
  const tiles = [
    { label: t("about.stats.manufacturers"), value: formatNumber(stats.manufacturers, locale) },
    { label: t("about.stats.products"), value: formatNumber(stats.products, locale) },
    { label: t("about.stats.clusters"), value: formatNumber(stats.clusters, locale) },
    { label: t("about.stats.countries"), value: formatNumber(stats.countriesServed, locale) },
  ];

  return (
    <ContentArticle
      eyebrow={t("about.eyebrow")}
      title={title}
      excerpt={page?.excerpt ?? t("about.metaDescription")}
      html={page?.html ?? ""}
      toc={page?.toc}
      tocTitle={t("common.onThisPage")}
      breadcrumbs={[{ label: t("common.home"), href: "/" }, { label: title }]}
      before={
        <>
          <JsonLd
            data={[
              organizationJsonLd(),
              breadcrumbJsonLd(
                [
                  { name: t("common.home"), path: "/" },
                  { name: title, path: "/about" },
                ],
                locale,
              ),
            ]}
          />
          <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((s) => (
              <StatTile key={s.label} value={s.value} label={s.label} />
            ))}
          </dl>
        </>
      }
      aside={
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-ink-900">{t("common.getStarted")}</p>
            <SupplierCta label={t("common.becomeSupplier")} size="sm" className="mt-3 w-full" />
            <Button href="/buyer/rfqs/new" variant="secondary" size="sm" className="mt-2 w-full">
              {t("common.postRfq")}
            </Button>
            <Button href="/contact" variant="ghost" size="sm" className="mt-2 w-full">
              {t("common.contactUs")}
            </Button>
          </CardContent>
        </Card>
      }
    />
  );
}
