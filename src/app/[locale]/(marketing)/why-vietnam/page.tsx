import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentArticle } from "@/components/marketplace/content-article";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { formatNumber, localized } from "@/lib/utils";
import { getClusters, getPlatformStats } from "@/modules/catalog/queries";
import { getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const STAT_KEYS = ["fta", "exports", "workforce", "cost", "growth", "ports"] as const;
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "content" }), getRenderedPage("why-vietnam", locale, "PAGE")]);
  return pageMetadata({
    locale,
    path: "/why-vietnam",
    title: page?.seoTitle ?? page?.title ?? t("whyVietnam.title"),
    description: page?.seoDescription ?? page?.excerpt ?? t("whyVietnam.metaDescription"),
  });
}

export default async function WhyVietnamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tm, page, stats, clusters] = await Promise.all([
    getTranslations("content"),
    getTranslations("marketplace"),
    getRenderedPage("why-vietnam", locale, "PAGE"),
    getPlatformStats(),
    getClusters(),
  ]);
  const title = page?.title ?? t("whyVietnam.title");
  const faq = FAQ_KEYS.map((k, i) => ({ q: t(`whyVietnam.faq.${k}`), a: t(`whyVietnam.faq.a${i + 1}`) }));

  return (
    <ContentArticle
      eyebrow={t("whyVietnam.eyebrow")}
      title={title}
      excerpt={page?.excerpt ?? t("whyVietnam.metaDescription")}
      html={page?.html ?? ""}
      toc={page?.toc}
      tocTitle={t("common.onThisPage")}
      breadcrumbs={[{ label: t("common.home"), href: "/" }, { label: title }]}
      before={
        <>
          <JsonLd
            data={[
              breadcrumbJsonLd(
                [
                  { name: t("common.home"), path: "/" },
                  { name: title, path: "/why-vietnam" },
                ],
                locale,
              ),
              faqJsonLd(faq),
            ]}
          />
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">{t("whyVietnam.stats.title")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STAT_KEYS.map((k) => (
                <div key={k} className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
                  <p className="font-display text-3xl font-bold text-ink-900">{t(`whyVietnam.stats.${k}.value`)}</p>
                  <p className="mt-1 text-sm font-semibold text-ink-800">{t(`whyVietnam.stats.${k}.label`)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-steel-600">{t(`whyVietnam.stats.${k}.body`)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      }
      aside={
        <>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-ink-900">{t("whyVietnam.cta")}</p>
              <p className="mt-1 text-sm text-steel-600">{t("whyVietnam.ctaBody")}</p>
              <Button href="/manufacturers" size="sm" className="mt-3 w-full">
                {t("common.browseManufacturers")}
              </Button>
              <Button href="/buyer/rfqs/new" variant="secondary" size="sm" className="mt-2 w-full">
                {t("common.postRfq")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel-500">{tm("clusters.title")}</p>
              <ul className="space-y-1.5 text-sm">
                {clusters.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/clusters/${c.slug}`} className="font-medium text-ink-800 hover:underline">
                      {localized(c as unknown as Record<string, unknown>, "name", locale)}
                    </Link>
                    <span className="ml-1.5 text-xs text-steel-500">{formatNumber(c.supplierCount, locale)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/clusters" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-900">
                {t("whyVietnam.browseClusters")} <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </>
      }
      after={
        <>
          <section className="mt-12 border-t border-steel-200 pt-8">
            <h2 className="mb-5 text-xl font-semibold sm:text-2xl">{t("common.faq")}</h2>
            <div className="max-w-3xl divide-y divide-steel-200 rounded-lg border border-steel-200 bg-white shadow-card">
              {faq.map((f) => (
                <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-start justify-between gap-4 text-sm font-semibold text-ink-900">
                    {f.q}
                    <span className="mt-0.5 shrink-0 text-steel-400 transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-steel-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
          <section className="mt-10 rounded-lg bg-ink-900 px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-xl font-bold sm:text-2xl text-white">{t("whyVietnam.cta")}</h2>
                <p className="mt-2 text-sm text-steel-300">{t("whyVietnam.ctaBody")}</p>
                <p className="mt-2 text-xs text-steel-400">
                  {formatNumber(stats.manufacturers, locale)} · {formatNumber(stats.products, locale)} · {formatNumber(stats.countriesServed, locale)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button href="/manufacturers" variant="accent">
                  {t("common.browseManufacturers")}
                </Button>
                <Button href="/clusters" variant="secondary">
                  {t("whyVietnam.browseClusters")}
                </Button>
              </div>
            </div>
          </section>
        </>
      }
    />
  );
}
