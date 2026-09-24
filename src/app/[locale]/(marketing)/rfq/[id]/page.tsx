import { BadgeCheck, CalendarClock, Globe2, Package, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { countryName } from "@/components/marketplace/labels";
import { Step } from "@/components/marketplace/section";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { SupplierCta } from "@/components/marketplace/supplier-cta";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent, CardHeader, DataList } from "@/components/ui/card";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { formatDate, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { getPublicRfqById } from "@/modules/catalog/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const rfq = await getPublicRfqById(id);
  if (!rfq) return {};
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return pageMetadata({
    locale,
    path: `/rfq/${rfq.id}`,
    title: rfq.title,
    description: t("rfq.detailMetaDescription", {
      number: rfq.rfqNumber,
      quantity: formatNumber(rfq.quantity, locale),
      unit: rfq.unit,
      title: rfq.title,
      country: rfq.destinationCountry ? localized(rfq.destinationCountry as unknown as Record<string, unknown>, "name", locale) : t("rfq.notSpecified"),
    }),
    noIndex: rfq.status !== "OPEN",
  });
}

export default async function PublicRfqPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const rfq = await getPublicRfqById(id);
  if (!rfq) notFound();
  const t = await getTranslations("marketplace");
  const path = `/rfq/${rfq.id}`;
  const isOpen = rfq.status === "OPEN";
  const categoryName = rfq.category ? localized(rfq.category as unknown as Record<string, unknown>, "name", locale) : null;
  const destination = rfq.destinationCountry ? localized(rfq.destinationCountry as unknown as Record<string, unknown>, "name", locale) : null;
  const buyerCountry = countryName(rfq.buyerCompany.countryCode, locale);

  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.rfq"), href: "/rfq" },
    { label: rfq.title },
  ];

  const facts: Array<{ label: string; value: ReactNode }> = [
    { label: t("rfq.rfqNumber"), value: <span className="font-mono">{rfq.rfqNumber}</span> },
    { label: t("rfq.quantity"), value: `${formatNumber(rfq.quantity, locale)} ${rfq.unit}` },
    { label: t("rfq.destination"), value: [destination, rfq.destinationCity].filter(Boolean).join(" · ") || t("rfq.notSpecified") },
    { label: t("rfq.targetPrice"), value: rfq.targetPrice != null ? formatMoney(rfq.targetPrice, rfq.targetCurrency, locale) : t("rfq.notSpecified") },
    { label: t("rfq.incoterm"), value: rfq.incoterm ?? t("rfq.notSpecified") },
    { label: t("rfq.paymentTerms"), value: rfq.preferredPaymentTerms ?? t("rfq.notSpecified") },
    { label: t("rfq.deadline"), value: rfq.quoteDeadline ? formatDate(rfq.quoteDeadline, locale) : t("rfq.notSpecified") },
    { label: t("rfq.requiredDelivery"), value: rfq.requiredDeliveryDate ? formatDate(rfq.requiredDeliveryDate, locale) : t("rfq.notSpecified") },
    { label: t("rfq.category"), value: categoryName ?? t("rfq.notSpecified") },
    { label: t("rfq.sampleRequired"), value: rfq.sampleRequired ? t("rfq.sampleRequiredYes") : t("rfq.notSpecified") },
  ];

  const requirements = [
    { label: t("rfq.certRequirements"), value: rfq.certificationRequirements },
    { label: t("rfq.customization"), value: rfq.customizationRequirements },
    { label: t("rfq.packaging"), value: rfq.packagingRequirements },
  ].filter((r) => r.value);

  return (
    <div className="container py-8">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t("breadcrumbs.home"), path: "/" },
            { name: t("breadcrumbs.rfq"), path: "/rfq" },
            { name: rfq.title, path },
          ],
          locale,
        )}
      />
      <PageHeader
        title={rfq.title}
        breadcrumbs={crumbs}
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono normal-case tracking-normal text-steel-500">{rfq.rfqNumber}</span>
            {categoryName ? <span className="text-steel-500">· {categoryName}</span> : null}
          </span>
        }
        actions={
          <>
            {isOpen ? (
              <Button href={`/seller/rfqs/${rfq.id}`}>{t("rfq.submitQuotation")}</Button>
            ) : (
              <Button disabled>{t("rfq.submitQuotation")}</Button>
            )}
            <Button href="/rfq" variant="secondary">
              {t("rfq.backToRfqs")}
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={rfq.status} label={humanize(rfq.status)} />
        {rfq.isPriority ? <Badge variant="brass">{t("rfq.priority")}</Badge> : null}
        <Badge variant="neutral">{t("rfq.quotations", { count: rfq.quotationCount })}</Badge>
        {rfq.publishedAt ? (
          <span className="text-xs text-steel-500">
            {t("rfq.posted")}: {formatDate(rfq.publishedAt, locale)}
          </span>
        ) : null}
        {rfq.expiresAt ? (
          <span className="text-xs text-steel-500">
            {t("rfq.expires")}: {formatDate(rfq.expiresAt, locale)}
          </span>
        ) : null}
      </div>

      {!isOpen ? (
        <Alert variant="warning" className="mb-6">
          {t("rfq.closed")}
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("rfq.description")}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-steel-700">{rfq.description}</p>
          </section>

          {rfq.items.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t("rfq.items")}</h2>
              <div className="space-y-3">
                {rfq.items.map((it, i) => (
                  <Card key={it.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-steel-500">
                            {t("rfq.item")} {i + 1}
                          </p>
                          <p className="mt-0.5 font-semibold text-ink-900">{it.productName}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold tabular-nums text-ink-900">
                            {formatNumber(it.quantity, locale)} {it.unit}
                          </p>
                          {it.targetPrice != null ? (
                            <p className="text-xs text-steel-500">
                              {t("rfq.targetPrice")}: {formatMoney(it.targetPrice, rfq.targetCurrency, locale)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {it.specifications ? (
                        <p className="mt-3 whitespace-pre-line border-t border-steel-100 pt-3 text-sm text-steel-600">
                          <span className="font-medium text-ink-800">{t("rfq.specifications")}: </span>
                          {it.specifications}
                        </p>
                      ) : null}
                      {it.notes ? <p className="mt-2 text-sm text-steel-500">{it.notes}</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("rfq.specifications")}</h2>
            <DataList items={facts} columns={2} />
          </section>

          {requirements.length ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t("rfq.requirements")}</h2>
              <div className="space-y-3">
                {requirements.map((r) => (
                  <div key={r.label} className="rounded-lg border border-steel-200 bg-white p-4 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">{r.label}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-steel-700">{r.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-steel-200 bg-steel-50/60 p-6">
            <h2 className="mb-5 text-lg font-semibold">{t("rfq.howToQuote")}</h2>
            <div className="space-y-5">
              <Step index={1} title={t("rfq.quoteStep1")} body={t("rfq.forSuppliersBody")} />
              <Step index={2} title={t("rfq.quoteStep2")} body={t("rfq.new.benefit2Body")} />
              <Step index={3} title={t("rfq.quoteStep3")} body={t("rfq.new.benefit3Body")} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {isOpen ? (
                <Button href={`/seller/rfqs/${rfq.id}`}>{t("rfq.submitQuotation")}</Button>
              ) : (
                <Button disabled>{t("rfq.submitQuotation")}</Button>
              )}
              <SupplierCta sellerHref="/seller/rfqs" variant="secondary" />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title={t("rfq.buyer")} />
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-steel-500">{t("rfq.buyerCompany")}</p>
                <p className="font-semibold text-ink-900">{rfq.buyerCompany.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-steel-400" />
                <span>{buyerCountry}</span>
              </div>
              {rfq.buyerCompany.verificationStatus === "VERIFIED" ? (
                <p className="inline-flex items-center gap-1.5 text-success-700">
                  <BadgeCheck className="size-4" /> {t("rfq.verifiedBuyer")}
                </p>
              ) : null}
              {rfq.buyerCompany.businessType ? <p className="text-steel-600">{humanize(rfq.buyerCompany.businessType)}</p> : null}
              <p className="border-t border-steel-100 pt-3 text-xs text-steel-500">{t("rfq.buyerIdentityNote")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex items-start gap-2.5">
                <Package className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("rfq.quantity")}</p>
                  <p className="font-semibold text-ink-900">
                    {formatNumber(rfq.quantity, locale)} {rfq.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe2 className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("rfq.destination")}</p>
                  <p className="font-semibold text-ink-900">{destination ?? t("rfq.notSpecified")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("rfq.deadline")}</p>
                  <p className="font-semibold text-ink-900">{rfq.quoteDeadline ? formatDate(rfq.quoteDeadline, locale) : t("rfq.notSpecified")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <ShieldCheck className="size-4 text-brass-600" /> {t("rfq.forBuyers")}
              </p>
              <p className="mt-2 text-sm text-steel-600">{t("rfq.forBuyersBody")}</p>
              <Button href="/buyer/rfqs/new" variant="secondary" size="sm" className="mt-3 w-full">
                {t("rfq.postYourRfq")}
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm">
            <Link href="/rfq" className="font-medium text-ink-700 hover:underline">
              ← {t("rfq.backToRfqs")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
