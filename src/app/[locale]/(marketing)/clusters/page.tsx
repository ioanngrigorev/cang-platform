import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClusterCard } from "@/components/marketplace/tiles";
import { EmptyState } from "@/components/ui/card";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getClusters, getIndustriesWithCounts } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, clusters] = await Promise.all([getTranslations({ locale, namespace: "marketplace" }), getClusters()]);
  return pageMetadata({
    locale,
    path: "/clusters",
    title: t("clusters.metaTitle"),
    description: t("clusters.metaDescription", { count: clusters.length }),
  });
}

export default async function ClustersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const [clusters, industries] = await Promise.all([getClusters(), getIndustriesWithCounts()]);
  const industryName = new Map(industries.map((i) => [i.slug, localized(i as unknown as Record<string, unknown>, "name", locale)]));
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.clusters") },
  ];

  return (
    <div className="container py-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("breadcrumbs.home"), path: "/" },
              { name: t("breadcrumbs.clusters"), path: "/clusters" },
            ],
            locale,
          ),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("clusters.title"),
            numberOfItems: clusters.length,
            itemListElement: clusters.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: localized(c as unknown as Record<string, unknown>, "name", locale),
              url: `${siteUrl()}/${locale}/clusters/${c.slug}`,
            })),
          },
        ]}
      />
      <PageHeader
        title={t("clusters.title")}
        description={t("clusters.subtitle")}
        breadcrumbs={crumbs}
        eyebrow={
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> Vietnam
          </span>
        }
      />

      {clusters.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {clusters.map((c) => {
            const name = localized(c as unknown as Record<string, unknown>, "name", locale);
            return (
              <ClusterCard
                key={c.id}
                href={`/clusters/${c.slug}`}
                name={name}
                region={c.region ? t(`clusters.${c.region.toLowerCase() === "north" ? "north" : c.region.toLowerCase() === "central" ? "central" : "south"}`) : undefined}
                headline={localized(c as unknown as Record<string, unknown>, "clusterHeadline", locale) || null}
                imageUrl={c.heroImageUrl}
                photoSubject={c.majorIndustries[0]}
                supplierLabel={t("clusters.suppliersIn", { count: c.supplierCount })}
                verifiedLabel={c.verifiedCount ? t("clusters.verifiedIn", { count: c.verifiedCount }) : undefined}
                industries={c.majorIndustries.map((s) => industryName.get(s) ?? s)}
                cta={t("clusters.viewCluster")}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<MapPin />} title={t("clusters.noSuppliers")} />
      )}
    </div>
  );
}
