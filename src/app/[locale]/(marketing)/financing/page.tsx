import { Banknote, Building2, CheckCircle2, Landmark, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IconCard, Section, SectionTitle, Step } from "@/components/marketplace/section";
import { Badge } from "@/components/ui/badge";
import { SupplierCta } from "@/components/marketplace/supplier-cta";
import { financingHref } from "@/lib/cta";
import { getAuth } from "@/modules/auth/current-user";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent } from "@/components/ui/card";
import { Avatar, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo";
import { formatMoney } from "@/lib/utils";
import { getFinancingProviders } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

/** Which products are marketed to which side of the marketplace. */
const BUYER_PRODUCTS = ["IMPORT_FINANCING", "BNPL", "PURCHASE_FINANCING"] as const;
const SELLER_PRODUCTS = ["WORKING_CAPITAL", "PRODUCTION_FINANCING", "PURCHASE_ORDER_FINANCING", "INVOICE_FACTORING", "RECEIVABLES_FINANCING"] as const;
const HOW_STEPS = ["s1", "s2", "s3"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return pageMetadata({ locale, path: "/financing", title: t("financing.title"), description: t("financing.metaDescription") });
}

export default async function FinancingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, providers, auth] = await Promise.all([getTranslations("content"), getFinancingProviders(), getAuth()]);
  const financingCta = financingHref(auth);

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t("common.home"), path: "/" },
            { name: t("financing.title"), path: "/financing" },
          ],
          locale,
        )}
      />

      <header className="border-b border-steel-200 bg-ink-950 text-white">
        <div className="container py-10 sm:py-14">
          <Breadcrumbs items={[{ label: t("common.home"), href: "/" }, { label: t("financing.title") }]} className="mb-4 text-steel-400 [&_a:hover]:text-white [&_span]:!text-steel-200" />
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brass-300">
            <Banknote className="size-3.5" /> {t("financing.eyebrow")}
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-white">{t("financing.title")}</h1>
          <p className="mt-4 max-w-3xl text-base text-steel-300 sm:text-lg">{t("financing.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button href={financingCta} variant="accent">
              {t("financing.cta")}
            </Button>
            <SupplierCta label={t("common.becomeSupplier")} variant="secondary" />
          </div>
        </div>
      </header>

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md bg-ink-900 text-white">
                <ShoppingCart className="size-4" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">{t("financing.forBuyers")}</h2>
                <p className="text-sm text-steel-600">{t("financing.forBuyersBody")}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {BUYER_PRODUCTS.map((p) => (
                <IconCard key={p} icon={<Banknote />} title={t(`financing.products.${p}`)} body={t(`financing.productBodies.${p}`)} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md bg-brand-500 text-on-brand">
                <Building2 className="size-4" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">{t("financing.forSellers")}</h2>
                <p className="text-sm text-steel-600">{t("financing.forSellersBody")}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {SELLER_PRODUCTS.map((p) => (
                <IconCard key={p} icon={<Landmark />} title={t(`financing.products.${p}`)} body={t(`financing.productBodies.${p}`)} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section tone="steel">
        <SectionTitle title={t("financing.providersTitle")} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar src={p.logoUrl} name={p.name} size={40} square />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    <Badge variant="neutral" size="sm" className="mt-1">
                      {t(`financing.providerTypes.${p.type}`)}
                    </Badge>
                  </div>
                </div>
                {p.description ? <p className="mt-3 text-sm text-steel-600">{p.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.products.map((pr) => (
                    <Badge key={pr} variant="ink" size="sm">
                      {t(`financing.products.${pr}`)}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-4 space-y-1.5 border-t border-steel-100 pt-3 text-xs">
                  {p.regulator ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-steel-500">{t("financing.regulator")}</dt>
                      <dd className="text-right font-medium text-ink-900">{p.regulator}</dd>
                    </div>
                  ) : null}
                  {p.minAmount != null && p.maxAmount != null ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-steel-500">{t("financing.amountRange")}</dt>
                      <dd className="text-right font-medium tabular-nums text-ink-900">
                        {formatMoney(p.minAmount, p.currencies[0] ?? "USD", locale, { compact: true, maxFractionDigits: 0 })} –{" "}
                        {formatMoney(p.maxAmount, p.currencies[0] ?? "USD", locale, { compact: true, maxFractionDigits: 0 })}
                      </dd>
                    </div>
                  ) : null}
                  {p.minTenorDays != null && p.maxTenorDays != null ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-steel-500">{t("financing.tenor")}</dt>
                      <dd className="text-right font-medium text-ink-900">{t("financing.tenorDays", { min: p.minTenorDays, max: p.maxTenorDays })}</dd>
                    </div>
                  ) : null}
                  {p.indicativeRate ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-steel-500">{t("financing.indicativeRate")}</dt>
                      <dd className="text-right font-medium text-ink-900">{p.indicativeRate}</dd>
                    </div>
                  ) : null}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <SectionTitle title={t("financing.howTitle")} />
            <div className="space-y-5">
              {HOW_STEPS.map((s, i) => (
                <Step key={s} index={i + 1} title={t(`financing.how.${s}`)} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-steel-200 bg-steel-50/60 p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <CheckCircle2 className="size-4 text-success-600" /> {t("financing.eligibility")}
              </p>
              <p className="mt-2 text-sm text-steel-600">{t("financing.eligibilityBody")}</p>
            </div>
            <Alert variant="warning" title={t("common.disclaimerTitle")}>
              {t("financing.disclaimer")}
            </Alert>
          </div>
        </div>
      </Section>

      <Section tone="ink">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">{t("financing.cta")}</h2>
            <p className="mt-2 text-sm text-steel-300">{t("financing.ctaBody")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href={financingCta} variant="accent">
              {t("financing.cta")}
            </Button>
            <Button href="/contact" variant="secondary">
              {t("common.contactUs")}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
