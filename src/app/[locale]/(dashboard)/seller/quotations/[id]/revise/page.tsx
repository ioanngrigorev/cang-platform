import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { QuotationForm } from "@/components/seller/sales/quotation-form";
import { Alert, Button, PageHeader } from "@/components/ui";
import { redirect } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSellerQuotation } from "@/modules/seller/sales/quotations/queries";
import { getSetting } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Revise quotation", robots: { index: false } };

export default async function ReviseQuotationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "quotation.write", seller: true });
  const t = await getTranslations("sales.quotationForm");
  const tq = await getTranslations("sales.quotations");

  const q = await getSellerQuotation(company.id, id);
  if (!q) notFound();
  const canRevise = q.rfq.status === "OPEN" && q.isLatestRevision && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status);
  if (!canRevise) redirect({ href: `/seller/quotations/${q.id}`, locale: await getLocale() });

  const defaultValidityDays = await getSetting("quotation.defaultValidityDays");

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: tq("title"), href: "/seller/quotations" },
          { label: q.quotationNumber, href: `/seller/quotations/${q.id}` },
          { label: t("reviseTitle") },
        ]}
        eyebrow={q.quotationNumber}
        title={t("reviseTitle")}
        description={t("reviseDescription", { n: q.revisionNumber + 1, rfq: q.rfq.title })}
        actions={
          <Button href={`/seller/quotations/${q.id}`} variant="secondary">
            {t("cancel")}
          </Button>
        }
      />

      {q.revisionRequest ? (
        <Alert variant="warning" title={t("buyerAsked", { date: formatDate(q.revisionRequest.createdAt, locale) })} className="mb-6">
          <p className="whitespace-pre-line">{q.revisionRequest.message}</p>
        </Alert>
      ) : null}

      <QuotationForm
        mode="revise"
        locale={locale}
        quotationId={q.id}
        targetCurrency={q.rfq.targetCurrency}
        rfq={{
          id: q.rfq.id,
          rfqNumber: q.rfq.rfqNumber,
          title: q.rfq.title,
          quantity: q.rfq.quantity,
          unit: q.rfq.unit,
          sampleRequired: q.rfq.sampleRequired,
          items: q.rfq.items.map((i) => ({ id: i.id, productName: i.productName, specifications: i.specifications, quantity: i.quantity, unit: i.unit, targetPrice: i.targetPrice })),
        }}
        defaults={{
          currency: q.currency,
          incoterm: q.incoterm,
          validityDays: defaultValidityDays,
          paymentTerms: q.paymentTerms,
          shippingCost: q.shippingCost,
          discount: q.discount,
          shippingMethod: q.shippingMethod,
          moq: q.moq,
          leadTimeDays: q.leadTimeDays,
          productionTimeNote: q.productionTimeNote,
          sampleAvailable: q.sampleAvailable,
          samplePrice: q.samplePrice,
          notes: q.notes,
          items: q.items.map((i) => ({ rfqItemId: i.rfqItemId, description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, notes: i.notes })),
          documents: q.documents.filter((d) => d.ownerCompanyId === company.id).map((d) => ({ id: d.id, url: d.url, name: d.name, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
        }}
      />
    </>
  );
}
