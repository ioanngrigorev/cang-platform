import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RfqForm } from "@/components/rfq/rfq-form";
import { PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { updateRfqAction } from "@/modules/rfq/actions";
import { categoryTree, countryOptions, getBuyerRfq, supplierPickerOptions } from "@/modules/rfq/queries";

export const metadata: Metadata = { title: "Edit RFQ", robots: { index: false } };

const asDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function EditRfqPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "rfq.write", buyer: true });
  const t = await getTranslations("rfq.form");

  const rfq = await getBuyerRfq(company.id, id);
  if (!rfq) notFound();
  if (rfq.status !== "DRAFT") notFound();

  const [categories, countries, suppliers] = await Promise.all([categoryTree(), countryOptions(), supplierPickerOptions()]);

  return (
    <>
      <PageHeader
        title={t("editTitle")}
        description={t("editDescription")}
        breadcrumbs={[
          { label: "RFQ", href: "/buyer/rfqs" },
          { label: rfq.rfqNumber, href: `/buyer/rfqs/${rfq.id}` },
          { label: t("editTitle") },
        ]}
      />
      <RfqForm
        action={updateRfqAction}
        rfqId={rfq.id}
        categories={categories}
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        suppliers={suppliers}
        locale={locale}
        defaults={{
          title: rfq.title,
          categoryId: rfq.categoryId,
          description: rfq.description,
          quantity: rfq.quantity,
          unit: rfq.unit,
          targetPrice: rfq.targetPrice,
          targetCurrency: rfq.targetCurrency,
          destinationCountryCode: rfq.destinationCountryCode,
          destinationCity: rfq.destinationCity,
          incoterm: rfq.incoterm,
          preferredPaymentTerms: rfq.preferredPaymentTerms,
          quoteDeadline: asDateInput(rfq.quoteDeadline),
          requiredDeliveryDate: asDateInput(rfq.requiredDeliveryDate),
          certificationRequirements: rfq.certificationRequirements,
          customizationRequirements: rfq.customizationRequirements,
          packagingRequirements: rfq.packagingRequirements,
          sampleRequired: rfq.sampleRequired,
          visibility: rfq.visibility,
          items: rfq.items.map((i) => ({
            productName: i.productName,
            specifications: i.specifications ?? "",
            quantity: String(i.quantity),
            unit: i.unit,
            targetPrice: i.targetPrice != null ? String(i.targetPrice) : "",
          })),
          documents: rfq.documents.map((d) => ({ id: d.id, url: d.url, name: d.name, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
          invitedSupplierIds: rfq.invitations.map((inv) => inv.supplierCompanyId),
        }}
      />
    </>
  );
}
