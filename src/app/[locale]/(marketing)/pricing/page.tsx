import { Percent, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingPlans, type PricingPlan } from "@/components/marketplace/pricing-plans";
import { Section, SectionTitle } from "@/components/marketplace/section";
import { SupplierCta } from "@/components/marketplace/supplier-cta";
import { sellerPlanHref } from "@/lib/cta";
import { getAuth } from "@/modules/auth/current-user";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getPublicPlans } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

/**
 * The three headline limits (products, RFQ responses, seats) are rendered from `plan.limits` in the
 * localized template rows, so drop the English feature strings that repeat them.
 */
const LIMIT_LIKE = /(\d+|unlimited)\s+(products?\b|team seats?\b)|rfqs?\s*(responses?|\/\s*month)|respond to \d+\s*rfqs?/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/pricing", title: t("pricing.title"), description: t("pricing.metaDescription") });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, rows, auth] = await Promise.all([getTranslations("content"), getPublicPlans(), getAuth()]);
  const faq = FAQ_KEYS.map((k, i) => ({ q: t(`pricing.faq.${k}`), a: t(`pricing.faq.a${i + 1}`) }));

  const plans: PricingPlan[] = rows.map((p) => ({
    code: p.code,
    name: localized(p as unknown as Record<string, unknown>, "name", locale),
    description: p.description,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    currency: p.currency,
    features: p.features.filter((f) => !LIMIT_LIKE.test(f)),
    highlighted: p.tier === "PREMIUM",
    isEnterprise: p.tier === "ENTERPRISE",
    limits: {
      maxProducts: p.limits.maxProducts,
      teamSeats: p.limits.teamSeats,
      featuredSlots: p.limits.featuredSlots,
      maxRfqResponsesPerMonth: p.limits.maxRfqResponsesPerMonth,
    },
  }));

  const labels = {
    monthly: t("pricing.monthly"),
    yearly: t("pricing.yearly"),
    yearlySave: t.raw("pricing.yearlySave"),
    perMonth: t("pricing.perMonth"),
    perYear: t("pricing.perYear"),
    billedYearly: t.raw("pricing.billedYearly"),
    free: t("pricing.free"),
    custom: t("pricing.custom"),
    cta: t("pricing.cta"),
    ctaEnterprise: t("pricing.ctaEnterprise"),
    ctaFree: t("pricing.ctaFree"),
    popular: t("pricing.popular"),
    products: t.raw("pricing.limits.products"),
    seats: t.raw("pricing.limits.seats"),
    rfqResponses: t.raw("pricing.limits.rfqResponses"),
    unlimited: t("pricing.limits.unlimited"),
  };

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: t("pricing.title"), path: "/pricing" },
            ],
            locale,
          ),
          faqJsonLd(faq),
        ]}
      />

      <header className="border-b border-steel-200 bg-ink-950 text-white">
        <div className="container py-10 sm:py-14">
          <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("pricing.title") }]} className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200" />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">{t("pricing.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{t("pricing.title")}</h1>
          <p className="mt-4 max-w-3xl text-base text-steel-300 sm:text-lg">{t("pricing.subtitle")}</p>
        </div>
      </header>

      <Section tone="white">
        <PricingPlans plans={plans} locale={locale} labels={labels} planHrefs={Object.fromEntries(plans.map((p) => [p.code, sellerPlanHref(auth, p.code)]))} />
      </Section>

      <Section tone="steel">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-ink-900">
              <Percent className="size-4 text-brass-600" /> {t("pricing.commissionTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-steel-600">{t("pricing.commissionBody")}</p>
          </div>
          <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-card">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-ink-900">
              <Users className="size-4 text-brass-600" /> {t("pricing.buyersTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-steel-600">{t("pricing.buyersBody")}</p>
            <Button href="/buyer/rfqs/new" variant="secondary" size="sm" className="mt-4">
              {t("common.postRfq")}
            </Button>
          </div>
        </div>
      </Section>

      <Section tone="white">
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
            <h2 className="font-display text-2xl font-bold text-white">{t("pricing.cta2")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("pricing.cta2Body")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SupplierCta label={t("common.becomeSupplier")} variant="accent" />
            <Button href="/contact" variant="secondary">
              {t("common.contactUs")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
