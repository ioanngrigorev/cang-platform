import { AlertTriangle, FileCheck2, Landmark, PackageCheck, Ruler, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlowSteps, IconCard, Section, SectionTitle, Step } from "@/components/marketplace/section";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const FLOW_KEYS = ["buyer", "escrow", "confirmation", "supplier", "production", "inspection", "shipment", "release"] as const;
const COVERAGE = [
  { key: "c1", icon: <PackageCheck /> },
  { key: "c2", icon: <ShieldCheck /> },
  { key: "c3", icon: <Ruler /> },
  { key: "c4", icon: <FileCheck2 /> },
] as const;
const DISPUTE_STEPS = ["s1", "s2", "s3", "s4"] as const;
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/trade-assurance", title: t("tradeAssurance.title"), description: t("tradeAssurance.metaDescription") });
}

export default async function TradeAssurancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tm] = await Promise.all([getTranslations("content"), getTranslations("marketplace")]);
  const faq = FAQ_KEYS.map((k, i) => ({ q: t(`tradeAssurance.faq.${k}`), a: t(`tradeAssurance.faq.a${i + 1}`) }));
  const flow = FLOW_KEYS.map((k) => t(`tradeAssurance.flow.${k}`));

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("tradeAssurance.title"), path: "/trade-assurance" },
            ],
            locale,
          ),
          faqJsonLd(faq),
        ]}
      />

      <header className="border-b border-steel-200 bg-ink-950 text-white">
        <div className="container py-10 sm:py-14">
          <Breadcrumbs
            items={[{ label: t("common.home"), href: "/" }, { label: t("tradeAssurance.title") }]}
            className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200"
          />
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">
            <ShieldCheck className="size-3.5" /> {t("tradeAssurance.eyebrow")}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{t("tradeAssurance.title")}</h1>
          <p className="mt-4 max-w-3xl text-base text-steel-300 sm:text-lg">{t("tradeAssurance.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href="/manufacturers" variant="accent">
              {t("common.browseManufacturers")}
            </Button>
            <Button href="/buyer/rfqs/new" variant="secondary">
              {t("common.postRfq")}
            </Button>
          </div>
        </div>
      </header>

      <Section tone="white">
        <SectionTitle title={t("tradeAssurance.flowTitle")} subtitle={t("tradeAssurance.fees")} />
        <FlowSteps steps={flow} />
        <div className="mt-8 flex items-start gap-3 rounded-lg border border-brass-200 bg-brass-50 p-5">
          <Landmark className="mt-0.5 size-5 shrink-0 text-brass-700" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink-900">{t("tradeAssurance.platformLineTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-800">{t("tradeAssurance.platformLine")}</p>
          </div>
        </div>
      </Section>

      <Section tone="steel">
        <SectionTitle title={t("tradeAssurance.coverageTitle")} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {COVERAGE.map((c) => (
            <IconCard key={c.key} icon={c.icon} title={t(`tradeAssurance.coverage.${c.key}Title`)} body={t(`tradeAssurance.coverage.${c.key}Body`)} />
          ))}
        </div>
      </Section>

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SectionTitle title={t("tradeAssurance.disputesTitle")} subtitle={t("tradeAssurance.disputesBody")} />
            <div className="space-y-5">
              {DISPUTE_STEPS.map((s, i) => (
                <Step key={s} index={i + 1} title={t(`tradeAssurance.disputeSteps.${s}`)} />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <Alert variant="warning" title={t("common.disclaimerTitle")}>
              <span className="inline-flex items-start gap-2">
                <Landmark className="mt-0.5 size-4 shrink-0" />
                {t("tradeAssurance.disclaimer")}
              </span>
            </Alert>
            <div className="rounded-lg border border-steel-200 bg-steel-50/60 p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <AlertTriangle className="size-4 text-brass-600" /> {t("common.coverage")}
              </p>
              <p className="mt-2 text-sm text-steel-600">{t("tradeAssurance.fees")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/inspection" variant="secondary" size="sm">
                  {t("inspection.title")}
                </Button>
                <Button href="/logistics" variant="secondary" size="sm">
                  {t("logistics.title")}
                </Button>
                <Button href="/financing" variant="secondary" size="sm">
                  {t("financing.title")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="steel">
        <SectionTitle title={t("common.faq")} />
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
      </Section>

      <Section tone="ink">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">{t("tradeAssurance.cta")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("tradeAssurance.ctaBody")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href="/manufacturers" variant="accent">
              {tm("breadcrumbs.manufacturers")}
            </Button>
            <Button href="/products" variant="secondary">
              {tm("breadcrumbs.products")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
