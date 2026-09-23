import { ExternalLink, EyeOff, Send } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/buyer/action-form";
import { ProductForm } from "@/components/seller/product-form";
import { DuplicateProductButton } from "@/components/seller/product-row-actions";
import { Alert, Button, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime, formatNumber, localized } from "@/lib/utils";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll } from "@/modules/company-profile/buyer-queries";
import { submitProductAction, unpublishProductAction } from "@/modules/seller/products/actions";
import { getSellerProduct, productFormOptions } from "@/modules/seller/products/queries";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { locale, id } = await params;
  const { saved } = await searchParams;
  const { company } = await requireCompany({ permission: "products.read", seller: true });
  const auth = await getAuth();
  const canWrite = canCompany(auth, "products.write");
  const canPublish = canCompany(auth, "products.publish");
  const t = await getTranslations("seller.products");

  const [product, { categories, certifications }, countries] = await Promise.all([getSellerProduct(company.id, id), productFormOptions(), countryOptionsAll()]);
  if (!product) notFound();

  const canSubmit = canPublish && ["DRAFT", "INACTIVE", "REJECTED", "ARCHIVED"].includes(product.status);
  const canUnpublish = canPublish && (product.status === "ACTIVE" || product.status === "PENDING_REVIEW");

  return (
    <>
      <PageHeader
        title={product.title}
        description={product.titleVi ?? undefined}
        eyebrow={product.category ? localized(product.category, "name", locale) : undefined}
        breadcrumbs={[
          { label: t("title"), href: "/seller/products" },
          { label: product.title },
        ]}
        actions={
          <>
            {product.status === "ACTIVE" ? (
              <Button href={`/product/${product.slug}`} variant="secondary" target="_blank">
                <ExternalLink /> {t("viewOnMarketplace")}
              </Button>
            ) : null}
            {canWrite ? <DuplicateProductButton productId={product.id} label={t("duplicate")} /> : null}
            {canSubmit ? <ActionForm action={submitProductAction} hidden={{ productId: product.id }} label={t("publish")} icon={<Send />} variant="primary" size="md" /> : null}
            {canUnpublish ? <ActionForm action={unpublishProductAction} hidden={{ productId: product.id }} label={t("unpublish")} icon={<EyeOff />} size="md" /> : null}
          </>
        }
      />

      {saved === "draft" && product.status === "DRAFT" ? (
        <Alert variant="success" className="mb-5">
          {t("savedDraft")}
        </Alert>
      ) : saved === "active" && product.status === "ACTIVE" ? (
        <Alert variant="success" className="mb-5">
          {t("savedActive")}
        </Alert>
      ) : saved === "pending_review" && product.status === "PENDING_REVIEW" ? (
        <Alert variant="info" className="mb-5">
          {t("savedPending")}
        </Alert>
      ) : null}

      {product.status === "REJECTED" && product.rejectionReason ? (
        <Alert variant="danger" title={t("rejectedReason")} className="mb-5">
          {product.rejectionReason}
        </Alert>
      ) : null}

      <div className="mb-5 rounded-lg border border-steel-200 bg-white px-5 py-4">
        <DataList
          columns={4}
          items={[
            { label: t("colStatus"), value: <StatusBadge status={product.status} label={t(`statuses.${product.status}`)} /> },
            { label: t("colViews"), value: `${formatNumber(product.viewCount, locale)} · ${t("inquiries", { count: product.inquiryCount })}` },
            { label: t("colOrders"), value: `${formatNumber(product.orderCount, locale)} · ${t("rfqs", { count: product.rfqCount })}` },
            { label: t("publishedAt"), value: product.publishedAt ? formatDateTime(product.publishedAt, locale) : "—" },
          ]}
        />
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        canPublish={canPublish}
        categories={categories.map((c) => ({ id: c.id, label: localized(c, "name", locale), level: c.level }))}
        certifications={certifications}
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        defaults={{
          title: product.title,
          titleVi: product.titleVi,
          categoryId: product.categoryId,
          sku: product.sku,
          shortDescription: product.shortDescription,
          description: product.description,
          descriptionVi: product.descriptionVi,
          priceType: product.priceType,
          currency: product.currency,
          basePrice: product.basePrice,
          unit: product.unit,
          moq: product.moq,
          leadTimeDays: product.leadTimeDays,
          leadTimeNote: product.leadTimeNote,
          hasSample: product.hasSample,
          samplePrice: product.samplePrice,
          sampleLeadDays: product.sampleLeadDays,
          customizable: product.customizable,
          oemAvailable: product.oemAvailable,
          odmAvailable: product.odmAvailable,
          packagingDetails: product.packagingDetails,
          shippingInfo: product.shippingInfo,
          hsCode: product.hsCode,
          originCountry: product.originCountry,
          brand: product.brand,
          model: product.model,
          videoUrl: product.videoUrl,
          keywords: product.keywords,
          tiers: product.priceTiers.map((x) => ({ minQty: x.minQty, maxQty: x.maxQty, price: x.price })),
          variants: product.variants.filter((v) => v.isActive).map((v) => ({ name: v.name, sku: v.sku, attributes: v.attributes ?? {}, price: v.price, moq: v.moq })),
          specs: product.specifications.map((s) => ({ name: s.name, value: s.value, unit: s.unit })),
          certificationIds: product.certifications.map((c) => c.certificationId),
          images: product.images.map((i) => ({ id: i.id, url: i.url })),
          status: product.status,
          slug: product.slug,
        }}
      />
    </>
  );
}
