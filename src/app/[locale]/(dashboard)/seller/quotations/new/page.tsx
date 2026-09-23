import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { QuotationForm } from "@/components/seller/sales/quotation-form";
import { Alert, Button, Card, CardContent, DataList, EmptyState, PageHeader } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { quotationPrefill } from "@/modules/seller/sales/quotations/queries";
import { getSetting } from "@/modules/settings/service";

export const metadata: Metadata = { title: "New quotation", robots: { index: false } };

export default async function NewQuotationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ rfq?: string }> }) {
  const { locale } = await params;
  const { rfq: rfqId } = await searchParams;
  const { company } = await requireCompany({ permission: "quotation.write", seller: true });
  const t = await getTranslations("sales.quotationForm");

  if (!rfqId) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: t("quotations"), href: "/seller/quotations" }, { label: t("newTitle") }]} title={t("newTitle")} />
        <EmptyState title={t("pickRfqTitle")} description={t("pickRfqHint")} action={<Button href="/seller/rfqs" variant="primary">{t("browseRfqs")}</Button>} />
      </>
    );
  }

  const prefill = await quotationPrefill(company.id, rfqId);
  if (!prefill) notFound();
  const { rfq, liveQuotation } = prefill;
  // A sent quotation already exists → work from its detail page (revise / withdraw) instead of a second one.
  if (liveQuotation && liveQuotation.status !== "DRAFT") redirect({ href: `/seller/quotations/${liveQuotation.id}`, locale: await getLocale() });

  const deadline = rfq.quoteDeadline ?? rfq.expiresAt;
  const closed = rfq.status !== "OPEN" || (!!deadline && deadline.getTime() < Date.now());
  const defaultValidityDays = await getSetting("quotation.defaultValidityDays");
  const draft = liveQuotation;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("quotations"), href: "/seller/quotations" },
          { label: rfq.rfqNumber, href: `/seller/rfqs/${rfq.id}` },
          { label: draft ? t("draftTitle") : t("newTitle") },
        ]}
        eyebrow={draft ? draft.quotationNumber : rfq.rfqNumber}
        title={draft ? t("draftTitle") : t("newTitle")}
        description={t("newDescription", { rfq: rfq.title, buyer: rfq.buyerCompany.name })}
        actions={
          <Button href={`/seller/rfqs/${rfq.id}`} variant="secondary">
            {t("viewRfq")}
          </Button>
        }
      />

      {closed ? (
        <Alert variant="warning" title={t("closedTitle")} className="mb-6">
          {t("closedBody")}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardContent>
          <DataList
            columns={4}
            items={[
              { label: t("rfqQuantity"), value: `${formatNumber(rfq.quantity, locale)} ${rfq.unit}` },
              { label: t("rfqTarget"), value: rfq.targetPrice ? formatMoney(rfq.targetPrice, rfq.targetCurrency, locale, { maxFractionDigits: 4 }) : "—" },
              { label: t("rfqDestination"), value: [rfq.incoterm, rfq.destinationCity, rfq.destinationCountry ? localized(rfq.destinationCountry, "name", locale) : null].filter(Boolean).join(" · ") || "—" },
              { label: t("rfqDeadline"), value: deadline ? formatDate(deadline, locale) : "—" },
            ]}
          />
        </CardContent>
      </Card>

      {closed ? null : (
        <QuotationForm
          mode={draft ? "draft" : "new"}
          locale={locale}
          quotationId={draft?.id ?? null}
          targetCurrency={rfq.targetCurrency}
          rfq={{
            id: rfq.id,
            rfqNumber: rfq.rfqNumber,
            title: rfq.title,
            quantity: rfq.quantity,
            unit: rfq.unit,
            sampleRequired: rfq.sampleRequired,
            items: rfq.items.map((i) => ({ id: i.id, productName: i.productName, specifications: i.specifications, quantity: i.quantity, unit: i.unit, targetPrice: i.targetPrice })),
          }}
          defaults={{
            currency: draft?.currency ?? rfq.targetCurrency,
            incoterm: draft?.incoterm ?? rfq.incoterm ?? null,
            validityDays: draft?.validUntil ? Math.max(1, Math.round((draft.validUntil.getTime() - Date.now()) / 86400000)) : defaultValidityDays,
            paymentTerms: draft?.paymentTerms ?? rfq.preferredPaymentTerms ?? null,
            shippingCost: draft?.shippingCost ?? null,
            discount: draft?.discount ?? null,
            shippingMethod: draft?.shippingMethod ?? null,
            moq: draft?.moq ?? null,
            leadTimeDays: draft?.leadTimeDays ?? null,
            productionTimeNote: draft?.productionTimeNote ?? null,
            sampleAvailable: draft?.sampleAvailable ?? false,
            samplePrice: draft?.samplePrice ?? null,
            notes: draft?.notes ?? null,
            items: draft ? draft.items.map((i) => ({ rfqItemId: i.rfqItemId, description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, notes: i.notes })) : [],
            documents: draft ? draft.documents.map((d) => ({ id: d.id, url: d.url, name: d.name, mimeType: d.mimeType, sizeBytes: d.sizeBytes })) : [],
          }}
        />
      )}
    </>
  );
}
