import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/seller/product-form";
import { PageHeader } from "@/components/ui";
import { localized } from "@/lib/utils";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll } from "@/modules/company-profile/buyer-queries";
import { productFormOptions } from "@/modules/seller/products/queries";

export const metadata: Metadata = { title: "New product", robots: { index: false } };

export default async function NewProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "products.write", seller: true });
  const auth = await getAuth();
  const t = await getTranslations("seller.products");
  const [{ categories, certifications }, countries] = await Promise.all([productFormOptions(), countryOptionsAll()]);

  return (
    <>
      <PageHeader
        title={t("newTitle")}
        description={t("newDescription")}
        breadcrumbs={[
          { label: t("title"), href: "/seller/products" },
          { label: t("newTitle") },
        ]}
      />
      <ProductForm
        mode="create"
        canPublish={canCompany(auth, "products.publish")}
        categories={categories.map((c) => ({ id: c.id, label: localized(c, "name", locale), level: c.level }))}
        certifications={certifications}
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        defaults={{
          title: "",
          titleVi: null,
          categoryId: "",
          sku: null,
          shortDescription: null,
          description: null,
          descriptionVi: null,
          priceType: "TIERED",
          currency: "USD",
          basePrice: null,
          unit: "pieces",
          moq: 500,
          leadTimeDays: null,
          leadTimeNote: null,
          hasSample: false,
          samplePrice: null,
          sampleLeadDays: null,
          customizable: false,
          oemAvailable: company.businessType === "OEM_MANUFACTURER",
          odmAvailable: company.businessType === "ODM_MANUFACTURER",
          packagingDetails: null,
          shippingInfo: null,
          hsCode: null,
          originCountry: company.countryCode || "VN",
          brand: null,
          model: null,
          videoUrl: null,
          keywords: [],
          tiers: [],
          variants: [],
          specs: [],
          certificationIds: [],
          images: [],
          status: "DRAFT",
          slug: null,
        }}
      />
    </>
  );
}
