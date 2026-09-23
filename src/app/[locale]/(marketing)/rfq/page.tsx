import { FileSearch, Send, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { rfqCardLabels } from "@/components/marketplace/labels";
import { RfqCard } from "@/components/marketplace/rfq-card";
import { RfqFilters } from "@/components/marketplace/rfq-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { JsonLd, PageHeader, Pagination } from "@/components/ui/misc";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";
import { buildQuery, first, type SearchParams } from "@/modules/catalog/filters";
import { getPublicRfqs, getRfqFacets } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const [t, result] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getPublicRfqs({ pageSize: 1 })]);
  const filtered = Object.keys(sp).some((k) => k !== "page" && sp[k]);
  return pageMetadata({
    locale,
    path: "/rfq",
    title: t("rfq.metaTitle"),
    description: t("rfq.metaDescription", { count: result.total }),
    noIndex: filtered,
  });
}

export default async function RfqMarketplacePage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const page = Math.max(1, Number(first(sp.page) ?? 1) || 1);
  const [result, facets] = await Promise.all([
    getPublicRfqs({ categorySlug: first(sp.category), destination: first(sp.destination), page }),
    getRfqFacets(),
  ]);
  const labels = rfqCardLabels(t);
  const path = "/rfq";
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.rfq") },
  ];

  return (
    <div className="container py-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("breadcrumbs.home"), path: "/" },
              { name: t("breadcrumbs.rfq"), path: "/rfq" },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("rfq.title"),
            numberOfItems: result.total,
            itemListElement: result.rows.map((r, i) => ({
              "@type": "ListItem",
              position: (result.page - 1) * result.pageSize + i + 1,
              name: r.title,
              url: `${siteUrl()}/${locale}/rfq/${r.id}`,
            })),
          },
        ]}
      />
      <PageHeader
        title={t("rfq.title")}
        description={t("rfq.subtitle")}
        breadcrumbs={crumbs}
        eyebrow={t("rfq.openCount", { count: result.total })}
        actions={
          <>
            <Button href="/buyer/rfqs/new">{t("rfq.postYourRfq")}</Button>
            <Button href="/register?type=seller" variant="secondary">
              {t("rfq.submitQuotation")}
            </Button>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3 rounded-lg border border-steel-200 bg-steel-50/60 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ink-900 text-white">
            <Send className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("rfq.forSuppliers")}</h2>
            <p className="mt-1 text-sm text-steel-600">{t("rfq.forSuppliersBody")}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-steel-200 bg-steel-50/60 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-500 text-on-brand">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("rfq.forBuyers")}</h2>
            <p className="mt-1 text-sm text-steel-600">{t("rfq.forBuyersBody")}</p>
          </div>
        </div>
      </div>

      <RfqFilters sp={sp} path={path} facets={facets} total={facets.categories.reduce((n, c) => n + c.count, 0)} />

      <p className="mt-6 text-sm text-steel-500">{t("listing.results", { count: result.total })}</p>

      {result.rows.length ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {result.rows.map((r) => (
            <RfqCard key={r.id} rfq={r} locale={locale} labels={labels} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<FileSearch />}
          title={t("rfq.noRfqs")}
          description={t("rfq.noRfqsHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href={path} variant="secondary" size="sm">
                {t("listing.clearAll")}
              </Button>
              <Button href="/buyer/rfqs/new" size="sm">
                {t("rfq.postYourRfq")}
              </Button>
            </div>
          }
        />
      )}

      <Pagination className="mt-8" page={result.page} totalPages={result.totalPages} hrefFor={(p) => `${path}${buildQuery(sp, { page: p > 1 ? p : null })}`} />

      <section className="mt-12 rounded-lg bg-ink-900 px-6 py-8 text-white sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold sm:text-2xl text-white">{t("rfq.new.title")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("rfq.new.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href="/buyer/rfqs/new" variant="accent">
              {t("rfq.postYourRfq")}
            </Button>
            <Button href="/register?type=seller" variant="secondary">
              {t("rfq.submitQuotation")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
