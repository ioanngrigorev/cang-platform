import { ClipboardCheck, Container, Factory, PackageSearch, Search, SearchCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Section, SectionTitle, Step } from "@/components/marketplace/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent } from "@/components/ui/card";
import { Avatar, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { getInspectionProviders } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const TYPES: Array<{ code: string; icon: ReactNode }> = [
  { code: "FACTORY_AUDIT", icon: <Factory /> },
  { code: "PRE_PRODUCTION", icon: <Search /> },
  { code: "DURING_PRODUCTION", icon: <PackageSearch /> },
  { code: "PRE_SHIPMENT", icon: <SearchCheck /> },
  { code: "CONTAINER_LOADING", icon: <Container /> },
];
const HOW_STEPS = ["s1", "s2", "s3"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/inspection", title: t("inspection.title"), description: t("inspection.metaDescription") });
}

export default async function InspectionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, providers] = await Promise.all([getTranslations("content"), getInspectionProviders()]);
  const faq = TYPES.map((ty) => ({ q: t(`inspection.types.${ty.code}`), a: t(`inspection.typeBodies.${ty.code}`) }));

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("inspection.title"), path: "/inspection" },
            ],
            locale,
          ),
          faqJsonLd(faq),
        ]}
      />

      <header className="border-b border-steel-200 bg-ink-950 text-white">
        <div className="container py-10 sm:py-14">
          <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("inspection.title") }]} className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200" />
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">
            <ClipboardCheck className="size-3.5" /> {t("inspection.eyebrow")}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{t("inspection.title")}</h1>
          <p className="mt-4 max-w-3xl text-base text-steel-300 sm:text-lg">{t("inspection.subtitle")}</p>
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
        <SectionTitle title={t("inspection.typesTitle")} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TYPES.map((ty, i) => (
            <div key={ty.code} className="flex flex-col rounded-lg border border-steel-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-md bg-ink-50 text-ink-800 [&_svg]:size-5">{ty.icon}</span>
                <span className="font-display text-2xl font-bold text-steel-200">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="text-lg font-semibold">{t(`inspection.types.${ty.code}`)}</h3>
              <Badge variant="brass" size="sm" className="mt-1.5 self-start">
                {t("inspection.when")}: {t(`inspection.whenValues.${ty.code}`)}
              </Badge>
              <p className="mt-3 text-sm leading-relaxed text-steel-600">{t(`inspection.typeBodies.${ty.code}`)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="steel">
        <SectionTitle title={t("inspection.providersTitle")} />
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
                  {p.services.map((s) => (
                    <Badge key={s} variant="neutral" size="sm">
                      {t(`inspection.types.${s}`)}
                    </Badge>
                  ))}
                </div>
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

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <SectionTitle title={t("inspection.howTitle")} />
            <div className="space-y-5">
              {HOW_STEPS.map((s, i) => (
                <Step key={s} index={i + 1} title={t(`inspection.how.${s}`)} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-steel-200 bg-steel-50/60 p-5">
              <p className="text-sm font-semibold text-ink-900">{t("inspection.pricing")}</p>
              <p className="mt-2 text-sm text-steel-600">{t("inspection.pricingBody")}</p>
            </div>
            <Alert variant="info" title={t("common.disclaimerTitle")}>
              {t("inspection.disclaimer")}
            </Alert>
          </div>
        </div>
      </Section>

      <Section tone="ink">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">{t("inspection.cta")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("inspection.ctaBody")}</p>
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
