import { FileText, MessageSquare, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SaveButton } from "@/components/buyer/save-button";
import { QuotationComparison } from "@/components/rfq/quotation-comparison";
import { RfqActions } from "@/components/rfq/rfq-actions";
import { Alert, Badge, Button, Card, CardContent, CardHeader, DataList, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerCompanyProfile } from "@/modules/company-profile/buyer-queries";
import { countryOptions, getBuyerRfq, savedSupplierIds } from "@/modules/rfq/queries";
import { getSetting } from "@/modules/settings/service";

export const metadata: Metadata = { title: "RFQ", robots: { index: false } };

export default async function BuyerRfqDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ published?: string; matched?: string; draft?: string }>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const { user, company } = await requireCompany({ permission: "rfq.read", buyer: true });
  const t = await getTranslations("rfq.detail");
  const tb = await getTranslations("buyer.saved");

  const rfq = await getBuyerRfq(company.id, id);
  if (!rfq) notFound();

  const [countries, profile, tradeAssuranceDefault, savedIds] = await Promise.all([
    countryOptions(),
    getBuyerCompanyProfile(company.id),
    getSetting("tradeAssurance.enabled"),
    savedSupplierIds(user.id),
  ]);

  const visibleQuotations = rfq.quotations.filter((q) => q.status !== "DRAFT" && q.status !== "WITHDRAWN");

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("backToList"), href: "/buyer/rfqs" },
          { label: rfq.rfqNumber },
        ]}
        eyebrow={rfq.rfqNumber}
        title={rfq.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rfq.status} />
            <span>
              {formatNumber(rfq.quantity, locale)} {rfq.unit}
            </span>
            {rfq.category ? <span>· {localized(rfq.category, "name", locale)}</span> : null}
            {rfq.publishedAt ? <span>· {t("published")} {formatDate(rfq.publishedAt, locale)}</span> : null}
          </span>
        }
        actions={<RfqActions rfqId={rfq.id} status={rfq.status} />}
      />

      {sp.published === "1" ? (
        <Alert variant="success" title={t("publishedTitle")} className="mb-6">
          {t("publishedBody", { count: Number(sp.matched ?? 0) })}
        </Alert>
      ) : sp.draft === "1" ? (
        <Alert variant="info" className="mb-6">
          {t("draftSaved")}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader title={t("quotations")} description={t("quotationsHint")} action={<Badge variant={visibleQuotations.length ? "info" : "neutral"}>{formatNumber(visibleQuotations.length, locale)}</Badge>} />
        <CardContent className={visibleQuotations.length ? "px-3 sm:px-5" : undefined}>
          {visibleQuotations.length === 0 ? (
            <EmptyState icon={<FileText />} title={t("noQuotations")} description={rfq.status === "DRAFT" ? t("noQuotationsDraft") : t("noQuotationsHint")} />
          ) : (
            <QuotationComparison
              rfqId={rfq.id}
              rfqStatus={rfq.status}
              locale={locale}
              countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
              tradeAssuranceDefault={tradeAssuranceDefault}
              defaultAddress={{
                company: profile?.name,
                phone: profile?.phone ?? undefined,
                line1: profile?.address ?? undefined,
                city: rfq.destinationCity ?? profile?.city ?? undefined,
                postalCode: profile?.postalCode ?? undefined,
                countryCode: rfq.destinationCountryCode ?? profile?.countryCode ?? undefined,
              }}
              rfqItems={rfq.items.map((i) => ({ id: i.id, productName: i.productName, quantity: i.quantity, unit: i.unit }))}
              quotations={visibleQuotations.map((q) => ({
                id: q.id,
                quotationNumber: q.quotationNumber,
                status: q.status,
                revisionNumber: q.revisionNumber,
                currency: q.currency,
                subtotal: q.subtotal,
                shippingCost: q.shippingCost,
                discount: q.discount,
                total: q.total,
                moq: q.moq,
                leadTimeDays: q.leadTimeDays,
                incoterm: q.incoterm,
                paymentTerms: q.paymentTerms,
                validUntil: q.validUntil ? q.validUntil.toISOString() : null,
                sampleAvailable: q.sampleAvailable,
                samplePrice: q.samplePrice,
                notes: q.notes,
                buyerNotes: q.buyerNotes,
                items: q.items.map((i) => ({ id: i.id, rfqItemId: i.rfqItemId, description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, total: i.total })),
                supplier: {
                  id: q.supplierCompany.id,
                  name: q.supplierCompany.name,
                  slug: q.supplierCompany.slug,
                  verificationStatus: q.supplierCompany.verificationStatus,
                  ratingAvg: q.supplierCompany.ratingAvg,
                  ratingCount: q.supplierCompany.ratingCount,
                  countryCode: q.supplierCompany.countryCode,
                  city: q.supplierCompany.city,
                },
                badges: rfq.badgesBySupplier[q.supplierCompanyId] ?? [],
              }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("specification")} />
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-900">{rfq.description}</p>
            </CardContent>
          </Card>

          {rfq.items.length ? (
            <Card>
              <CardHeader title={t("lineItems")} />
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-steel-50 text-left text-xs font-semibold uppercase tracking-wide text-steel-500">
                      <tr>
                        <th className="px-5 py-2.5">{t("itemName")}</th>
                        <th className="px-5 py-2.5">{t("itemQuantity")}</th>
                        <th className="px-5 py-2.5">{t("itemTarget")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-100">
                      {rfq.items.map((i) => (
                        <tr key={i.id}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-ink-900">{i.productName}</p>
                            {i.specifications ? <p className="mt-0.5 text-xs text-steel-500">{i.specifications}</p> : null}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-steel-600">
                            {formatNumber(i.quantity, locale)} {i.unit}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-steel-600">{i.targetPrice ? formatMoney(i.targetPrice, rfq.targetCurrency, locale) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {rfq.certificationRequirements || rfq.customizationRequirements || rfq.packagingRequirements ? (
            <Card>
              <CardHeader title={t("requirements")} />
              <CardContent className="space-y-4">
                {rfq.certificationRequirements ? <Requirement label={t("certifications")} value={rfq.certificationRequirements} /> : null}
                {rfq.customizationRequirements ? <Requirement label={t("customization")} value={rfq.customizationRequirements} /> : null}
                {rfq.packagingRequirements ? <Requirement label={t("packaging")} value={rfq.packagingRequirements} /> : null}
              </CardContent>
            </Card>
          ) : null}

          {rfq.documents.length ? (
            <Card>
              <CardHeader title={t("attachments")} />
              <CardContent className="p-0">
                <ul className="divide-y divide-steel-100">
                  {rfq.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-steel-400" />
                        <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-ink-900 hover:underline">
                          {d.name}
                        </a>
                      </span>
                      <span className="shrink-0 text-xs text-steel-500">{(d.sizeBytes / 1024).toFixed(0)} KB</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("requirements")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("quantity"), value: `${formatNumber(rfq.quantity, locale)} ${rfq.unit}` },
                  { label: t("targetPrice"), value: rfq.targetPrice ? formatMoney(rfq.targetPrice, rfq.targetCurrency, locale) : "—" },
                  { label: t("destination"), value: [rfq.destinationCity, rfq.destinationCountry ? localized(rfq.destinationCountry, "name", locale) : null].filter(Boolean).join(", ") || "—" },
                  { label: t("incoterm"), value: rfq.incoterm ?? "—" },
                  { label: t("paymentTerms"), value: rfq.preferredPaymentTerms ?? "—" },
                  { label: t("quoteDeadline"), value: rfq.quoteDeadline ? formatDate(rfq.quoteDeadline, locale) : "—" },
                  { label: t("requiredDelivery"), value: rfq.requiredDeliveryDate ? formatDate(rfq.requiredDeliveryDate, locale) : "—" },
                  { label: t("sample"), value: rfq.sampleRequired ? t("sampleYes") : t("sampleNo") },
                  { label: t("visibility"), value: rfq.visibility === "PUBLIC" ? t("visibilityPublic") : t("visibilityInvited") },
                  { label: t("views"), value: formatNumber(rfq.viewCount, locale) },
                  { label: t("created"), value: formatDate(rfq.createdAt, locale) },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("invitedSuppliers")} action={<Users className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {rfq.invitations.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">—</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {rfq.invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={`/supplier/${inv.supplier.slug}`} className="truncate text-sm font-medium text-ink-900 hover:underline">
                          {inv.supplier.name}
                        </Link>
                        <p className="text-xs text-steel-500">{inv.status === "PENDING" ? t("notAnswered") : humanize(inv.status)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <SaveButton
                          kind="supplier"
                          id={inv.supplier.id}
                          saved={savedIds.includes(inv.supplier.id)}
                          labelSave={tb("save")}
                          labelSaved={tb("saved")}
                          size="xs"
                          variant="ghost"
                        />
                        <Button href={`/buyer/messages/new?supplier=${inv.supplier.slug}&rfq=${rfq.id}`} variant="ghost" size="icon" aria-label={t("messageSupplier")}>
                          <MessageSquare />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Requirement({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{value}</p>
    </div>
  );
}
