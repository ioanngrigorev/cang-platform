import { Anchor, Boxes, FileCheck2, Plane, Ship, ShieldCheck, Train, Truck, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FlowSteps, IconCard, Section, SectionTitle } from "@/components/marketplace/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent } from "@/components/ui/card";
import { Avatar, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { getLogisticsProviders } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const FEATURED_SERVICES: Array<{ code: string; icon: ReactNode }> = [
  { code: "SEA_FREIGHT", icon: <Ship /> },
  { code: "AIR_FREIGHT", icon: <Plane /> },
  { code: "RAIL_FREIGHT", icon: <Train /> },
  { code: "CUSTOMS_BROKERAGE", icon: <FileCheck2 /> },
  { code: "WAREHOUSING", icon: <Warehouse /> },
  { code: "CARGO_INSURANCE", icon: <ShieldCheck /> },
];
const ALL_SERVICES = [
  "FACTORY_PICKUP",
  "DOMESTIC_TRANSPORT",
  "WAREHOUSING",
  "FREIGHT_FORWARDING",
  "SEA_FREIGHT",
  "AIR_FREIGHT",
  "RAIL_FREIGHT",
  "CUSTOMS_BROKERAGE",
  "LAST_MILE",
  "CARGO_INSURANCE",
] as const;
const FLOW_KEYS = ["factory", "pickup", "warehouse", "port", "international", "customs", "buyer"] as const;
const TRANSIT_ROWS = ["eu", "usw", "use", "asia", "air"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/logistics", title: t("logistics.title"), description: t("logistics.metaDescription") });
}

export default async function LogisticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, providers] = await Promise.all([getTranslations("content"), getLogisticsProviders()]);
  const faq = TRANSIT_ROWS.map((r) => ({ q: t(`logistics.transitRows.${r}`), a: t(`logistics.transitRows.${r}Days`) }));

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("logistics.title"), path: "/logistics" },
            ],
            locale,
          ),
          faqJsonLd(faq),
        ]}
      />

      <header className="border-b border-steel-200 bg-ink-950 text-white">
        <div className="container py-10 sm:py-14">
          <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("logistics.title") }]} className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200" />
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">
            <Anchor className="size-3.5" /> {t("logistics.eyebrow")}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{t("logistics.title")}</h1>
          <p className="mt-4 max-w-3xl text-base text-steel-300 sm:text-lg">{t("logistics.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href="/buyer/rfqs/new" variant="accent">
              {t("common.postRfq")}
            </Button>
            <Button href="/trade-assurance" variant="secondary">
              {t("tradeAssurance.title")}
            </Button>
          </div>
        </div>
      </header>

      <Section tone="white">
        <SectionTitle title={t("logistics.flowTitle")} />
        <FlowSteps steps={FLOW_KEYS.map((k) => t(`logistics.flow.${k}`))} />
      </Section>

      <Section tone="steel">
        <SectionTitle title={t("logistics.servicesTitle")} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FEATURED_SERVICES.map((s) => (
            <IconCard key={s.code} icon={s.icon} title={t(`logistics.services.${s.code}`)} body={t(`logistics.serviceBodies.${s.code}`)} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {ALL_SERVICES.map((s) => (
            <Badge key={s} variant="neutral" size="md">
              {t(`logistics.services.${s}`)}
            </Badge>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <SectionTitle title={t("logistics.providersTitle")} subtitle={t("logistics.providersBody")} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar src={p.logoUrl} name={p.name} size={40} square />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-steel-500">{t("common.demoPartner")}</p>
                  </div>
                </div>
                {p.description ? <p className="mt-3 text-sm text-steel-600">{p.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.modes.map((m) => (
                    <Badge key={m} variant="ink" size="sm">
                      {t(`logistics.modes.${m}`)}
                    </Badge>
                  ))}
                </div>
                <ul className="mt-3 space-y-1 text-xs text-steel-600">
                  {p.services.slice(0, 5).map((s) => (
                    <li key={s} className="flex items-start gap-1.5">
                      <Truck className="mt-0.5 size-3 shrink-0 text-steel-400" />
                      {t(`logistics.services.${s}`)}
                    </li>
                  ))}
                </ul>
                {p.countries.length ? (
                  <p className="mt-3 border-t border-steel-100 pt-2 text-xs text-steel-500">
                    {t("common.countries")}: {p.countries.join(", ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="steel">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <SectionTitle title={t("logistics.transit")} />
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("logistics.route")}</TH>
                    <TH className="text-right">{t("logistics.duration")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {TRANSIT_ROWS.map((r) => (
                    <TR key={r}>
                      <TD>{t(`logistics.transitRows.${r}`)}</TD>
                      <TD className="text-right font-medium tabular-nums text-ink-900">{t(`logistics.transitRows.${r}Days`)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
          <div className="space-y-4">
            <Alert variant="info" title={t("common.disclaimerTitle")}>
              {t("logistics.disclaimer")}
            </Alert>
            <div className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Boxes className="size-4 text-brass-600" /> {t("logistics.cta")}
              </p>
              <p className="mt-2 text-sm text-steel-600">{t("logistics.ctaBody")}</p>
              <Button href="/buyer/rfqs/new" size="sm" className="mt-3 w-full">
                {t("common.postRfq")}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="ink">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">{t("logistics.cta")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("logistics.ctaBody")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href="/buyer/rfqs/new" variant="accent">
              {t("common.postRfq")}
            </Button>
            <Button href="/manufacturers" variant="secondary">
              {t("common.browseManufacturers")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
