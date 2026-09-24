import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductAdminActions } from "@/components/admin/product-actions";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader, SmartImage, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatMoney, humanize, localized } from "@/lib/utils";
import { getAdminProduct } from "@/modules/admin/products/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Product", robots: { index: false } };

export default async function AdminProductDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.products.moderate");
  const t = await getTranslations("admin.products");
  const tc = await getTranslations("admin.common");
  const p = await getAdminProduct(id);
  if (!p) notFound();

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/products" }, { label: p.title }]}
        eyebrow={p.sku ?? p.slug}
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} />
            {p.isFeatured ? <Badge variant="brass">{t("featured")}</Badge> : null}
            <Link href={`/admin/companies/${p.company.id}`} className="hover:underline">
              {p.company.name}
            </Link>
            <span>· {localized(p.category, "name", locale)}</span>
            {p.status === "ACTIVE" ? (
              <Link href={`/product/${p.slug}`} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                <ExternalLink className="size-3" /> {t("viewPublic")}
              </Link>
            ) : null}
          </span>
        }
        actions={<ProductAdminActions productId={p.id} status={p.status} isFeatured={p.isFeatured} searchBoost={p.searchBoost} canModerate={canPlatform(auth, "admin.products.moderate")} />}
      />

      {p.rejectionReason ? (
        <Alert variant="danger" title={t("rejectionReason")} className="mb-6">
          {p.rejectionReason}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("images")} />
            <CardContent>
              {p.images.length === 0 ? (
                <p className="text-sm text-steel-500">{t("noImages")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {p.images.map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-md border border-hairline bg-steel-50">
                      <SmartImage src={img.url} alt={img.alt ?? p.title} photo fallbackLabel={p.title} className="h-full w-full object-cover" />
                      {img.isPrimary ? <Badge size="sm" variant="ink" className="absolute left-1.5 top-1.5">{t("primaryImage")}</Badge> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("details")} />
            <CardContent className="space-y-4">
              <DataList
                columns={3}
                items={[
                  { label: t("priceType"), value: humanize(p.priceType) },
                  { label: t("basePrice"), value: p.basePrice != null ? formatMoney(p.basePrice, p.currency, locale) : "—" },
                  { label: t("moq"), value: `${p.moq} ${p.unit}` },
                  { label: t("leadTime"), value: p.leadTimeDays ? `${p.leadTimeDays} d${p.leadTimeNote ? ` · ${p.leadTimeNote}` : ""}` : "—" },
                  { label: t("sample"), value: p.hasSample ? `${p.samplePrice != null ? formatMoney(p.samplePrice, p.currency, locale) : tc("yes")}${p.sampleLeadDays ? ` · ${p.sampleLeadDays} d` : ""}` : tc("no") },
                  { label: t("capabilities"), value: [p.customizable ? t("customizable") : null, p.oemAvailable ? "OEM" : null, p.odmAvailable ? "ODM" : null].filter(Boolean).join(" · ") || "—" },
                  { label: t("origin"), value: p.originCountry },
                  { label: t("hsCode"), value: p.hsCode ?? "—" },
                  { label: t("brand"), value: [p.brand, p.model].filter(Boolean).join(" / ") || "—" },
                  { label: t("keywords"), value: p.keywords.join(", ") || "—" },
                  { label: t("stats"), value: t("statsValue", { views: p.viewCount, inquiries: p.inquiryCount, rfqs: p.rfqCount, orders: p.orderCount }) },
                  { label: t("searchBoost"), value: p.searchBoost },
                ]}
              />
              {p.shortDescription ? <p className="text-sm font-medium text-ink-900">{p.shortDescription}</p> : null}
              {p.description ? <p className="whitespace-pre-wrap text-sm text-steel-600">{p.description}</p> : null}
              {p.titleVi || p.descriptionVi ? (
                <div className="rounded-md border border-hairline bg-steel-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("vietnamese")}</p>
                  {p.titleVi ? <p className="font-medium text-ink-900">{p.titleVi}</p> : null}
                  {p.descriptionVi ? <p className="whitespace-pre-wrap text-steel-600">{p.descriptionVi}</p> : null}
                </div>
              ) : null}
              {p.packagingDetails || p.shippingInfo ? (
                <DataList
                  columns={2}
                  items={[
                    { label: t("packaging"), value: p.packagingDetails ?? "—" },
                    { label: t("shipping"), value: p.shippingInfo ?? "—" },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>

          {p.priceTiers.length ? (
            <Card>
              <CardHeader title={t("priceTiers")} />
              <CardContent className="p-0">
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("quantity")}</TH>
                      <TH className="text-right">{t("unitPrice")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {p.priceTiers.map((tier) => (
                      <TR key={tier.id}>
                        <TD>
                          {tier.minQty}
                          {tier.maxQty ? ` – ${tier.maxQty}` : "+"} {p.unit}
                        </TD>
                        <TD className="text-right tabular-nums">{formatMoney(tier.price, tier.currency, locale)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {p.specifications.length ? (
            <Card>
              <CardHeader title={t("specifications")} />
              <CardContent>
                <DataList columns={3} items={p.specifications.map((s) => ({ label: s.name, value: `${s.value}${s.unit ? ` ${s.unit}` : ""}` }))} />
              </CardContent>
            </Card>
          ) : null}

          {p.variants.length ? (
            <Card>
              <CardHeader title={t("variants")} />
              <CardContent className="p-0">
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("variant")}</TH>
                      <TH>{t("attributes")}</TH>
                      <TH className="text-right">{t("unitPrice")}</TH>
                      <TH className="text-right">{t("moq")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {p.variants.map((v) => (
                      <TR key={v.id}>
                        <TD className="font-medium">
                          {v.name}
                          {v.sku ? <span className="ml-1 text-xs text-steel-500">{v.sku}</span> : null}
                        </TD>
                        <TD className="text-xs text-steel-600">
                          {Object.entries(v.attributes)
                            .map(([k, val]) => `${k}: ${val}`)
                            .join(", ")}
                        </TD>
                        <TD className="text-right tabular-nums">{v.price != null ? formatMoney(v.price, p.currency, locale) : "—"}</TD>
                        <TD className="text-right tabular-nums">{v.moq ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("supplier")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("supplier"), value: <Link href={`/admin/companies/${p.company.id}`} className="font-medium text-ink-900 hover:underline">{p.company.name}</Link> },
                  { label: tc("status"), value: <StatusBadge status={p.company.status} size="sm" /> },
                  { label: t("verification"), value: <StatusBadge status={p.company.verificationStatus} label={tc(`verification.${p.company.verificationStatus}`)} size="sm" /> },
                  { label: t("country"), value: p.company.countryCode },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("moderation")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("reviewedBy"), value: p.reviewedBy?.name ?? "—" },
                  { label: t("publishedAt"), value: p.publishedAt ? formatDateTime(p.publishedAt, locale) : "—" },
                  { label: t("featuredUntil"), value: p.featuredUntil ? formatDateTime(p.featuredUntil, locale) : "—" },
                  { label: t("createdAt"), value: formatDateTime(p.createdAt, locale) },
                  { label: t("updatedAt"), value: formatDateTime(p.updatedAt, locale) },
                  { label: t("certifications"), value: p.certifications.map((c) => c.certification.name).join(", ") || "—" },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
