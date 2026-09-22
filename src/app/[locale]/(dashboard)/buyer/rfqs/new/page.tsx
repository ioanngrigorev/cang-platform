import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RfqForm } from "@/components/rfq/rfq-form";
import { PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerCompanyProfile } from "@/modules/company-profile/buyer-queries";
import { createRfqAction } from "@/modules/rfq/actions";
import { categoryTree, countryOptions, productPrefill, supplierPickerOptions, supplierPrefill } from "@/modules/rfq/queries";

export const metadata: Metadata = { title: "New RFQ", robots: { index: false } };

export default async function NewRfqPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; supplier?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "rfq.write", buyer: true });
  const t = await getTranslations("rfq.form");

  const [categories, countries, suppliers, profile, product, supplier] = await Promise.all([
    categoryTree(),
    countryOptions(),
    supplierPickerOptions(),
    getBuyerCompanyProfile(company.id),
    sp.product ? productPrefill(sp.product) : Promise.resolve(null),
    sp.supplier ? supplierPrefill(sp.supplier) : Promise.resolve(null),
  ]);

  const buyerProfile = profile?.buyerProfile ?? null;
  const defaults = {
    title: product ? `${product.title}` : undefined,
    categoryId: product?.categoryId ?? null,
    description: product?.shortDescription ?? undefined,
    quantity: product?.moq ?? undefined,
    unit: product?.unit ?? "pieces",
    targetPrice: product?.basePrice ?? null,
    targetCurrency: buyerProfile?.preferredCurrency ?? product?.currency ?? "USD",
    destinationCountryCode: buyerProfile?.destinationCountries?.[0] ?? profile?.countryCode ?? null,
    destinationCity: profile?.city ?? null,
    incoterm: buyerProfile?.preferredIncoterms?.[0] ?? null,
    invitedSupplierIds: [supplier?.id ?? product?.company?.id].filter((x): x is string => !!x),
    visibility: supplier ? "INVITED_ONLY" : "PUBLIC",
  };

  return (
    <>
      <PageHeader
        title={t("createTitle")}
        description={t("createDescription")}
        breadcrumbs={[
          { label: "CANG", href: "/buyer" },
          { label: t("createTitle") },
        ]}
      />
      <RfqForm
        action={createRfqAction}
        categories={categories}
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        suppliers={suppliers}
        defaults={defaults}
        locale={locale}
      />
    </>
  );
}
