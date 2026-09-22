import { FileText, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SaveButton } from "@/components/buyer/save-button";
import { QuotationActions } from "@/components/rfq/quotation-comparison";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, RatingStars, StatusBadge, TBody, TD, TH, THead, TR, Table, TrustBadges } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerCompanyProfile } from "@/modules/company-profile/buyer-queries";
import { countryOptions, getBuyerQuotation, savedSupplierIds } from "@/modules/rfq/queries";
import { getSetting } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Quotation", robots: { index: false } };

export default async function BuyerQuotationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { user, company } = await requireCompany({ permission: "quotation.read", buyer: true });
  const t = await getTranslations("rfq.quotations");
  const tc = await getTranslations("rfq.compare");
  const tb = await getTranslations("buyer.saved");

  const q = await getBuyerQuotation(company.id, id);
  if (!q) notFound();

  const [countries, profile, tradeAssuranceDefault, savedIds] = await Promise.all([
    countryOptions(),
    getBuyerCompanyProfile(company.id),
    getSetting("tradeAssurance.enabled"),
    savedSupplierIds(user.id),
  ]);
  const badges = q.supplierCompany.badges.map((b) => b.badge.code);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: "/buyer/quotations" },
          { label: q.quotationNumber },
        ]}
        title={t("detailTitle", { number: q.quotationNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={q.status} />
            <Link href={`/buyer/rfqs/${q.rfqId}`} className="hover:underline">
              {q.rfq.title}
            </Link>
          </span>
        }
        actions={
          <Button href={`/buyer/rfqs/${q.rfqId}`} variant="secondary">
            {t("openRfq")}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("items")} />
            <CardContent className="p-0">
              <Table className="border-0">
                <THead>
                  <TR>
                    <TH>{t("description")}</TH>
                    <TH>{t("quantity")}</TH>
                    <TH>{t("unitPrice")}</TH>
                    <TH>{t("lineTotal")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {q.items.map((i) => (
                    <TR key={i.id}>
                      <TD>
                        <p className="font-medium text-ink-900">{i.description}</p>
                        {i.notes ? <p className="mt-0.5 text-xs text-steel-500">{i.notes}</p> : null}
                      </TD>
                      <TD className="whitespace-nowrap text-steel-600">
                        {formatNumber(i.quantity, locale)} {i.unit}
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums">{formatMoney(i.unitPrice, q.currency, locale, { maxFractionDigits: 4 })}</TD>
                      <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(i.total, q.currency, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <dl className="space-y-2 border-t border-steel-100 px-5 py-4 text-sm">
                <Row label={tc("subtotal")} value={formatMoney(q.subtotal, q.currency, locale)} />
                <Row label={tc("shipping")} value={q.shippingCost > 0 ? formatMoney(q.shippingCost, q.currency, locale) : tc("included")} />
                {q.discount > 0 ? <Row label={tc("discount")} value={`− ${formatMoney(q.discount, q.currency, locale)}`} /> : null}
                <div className="flex items-center justify-between border-t border-steel-100 pt-2">
                  <dt className="font-semibold text-ink-900">{tc("total")}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums text-ink-900">{formatMoney(q.total, q.currency, locale)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("terms")} />
            <CardContent>
              <DataList
                columns={2}
                items={[
                  { label: tc("moq"), value: q.moq ? formatNumber(q.moq, locale) : "—" },
                  { label: tc("leadTime"), value: q.leadTimeDays ? tc("days", { n: q.leadTimeDays }) : "—" },
                  { label: tc("incoterm"), value: q.incoterm ?? "—" },
                  { label: tc("paymentTerms"), value: q.paymentTerms ?? "—" },
                  { label: tc("validUntil"), value: q.validUntil ? formatDate(q.validUntil, locale) : "—" },
                  { label: tc("sample"), value: q.sampleAvailable ? (q.samplePrice ? tc("sampleFor", { price: formatMoney(q.samplePrice, q.currency, locale) }) : tc("sampleYes")) : tc("sampleNo") },
                ]}
              />
              {q.notes ? (
                <div className="mt-4 border-t border-steel-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("notes")}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{q.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {q.documents.length ? (
            <Card>
              <CardHeader title={t("attachments")} />
              <CardContent className="p-0">
                <ul className="divide-y divide-steel-100">
                  {q.documents.map((d) => (
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

          {q.revisions.length > 1 ? (
            <Card>
              <CardHeader title={t("revisionChain")} />
              <CardContent className="p-0">
                <ul className="divide-y divide-steel-100">
                  {q.revisions.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <Link href={`/buyer/quotations/${r.id}`} className="font-medium text-ink-900 hover:underline">
                          {r.quotationNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {t("revisionOf", { n: r.revisionNumber })} · {formatDate(r.createdAt, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-steel-600">{formatMoney(r.total, r.currency, locale)}</span>
                        {r.id === q.id ? <Badge variant="ink" size="sm">{t("current")}</Badge> : <StatusBadge status={r.status} size="sm" />}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("supplierCard")} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={q.supplierCompany.logoUrl} name={q.supplierCompany.name} size={44} square />
                <div className="min-w-0">
                  <Link href={`/supplier/${q.supplierCompany.slug}`} className="font-semibold text-ink-900 hover:underline">
                    {q.supplierCompany.name}
                  </Link>
                  <p className="text-xs text-steel-500">
                    {[q.supplierCompany.city, q.supplierCompany.countryCode].filter(Boolean).join(", ")}
                  </p>
                  <RatingStars value={q.supplierCompany.ratingAvg} count={q.supplierCompany.ratingCount} className="mt-1" />
                </div>
              </div>
              <TrustBadges codes={badges} size="sm" />
              <p className="text-xs text-steel-500">{t("productCount", { count: q.supplierProductCount })}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button href={`/supplier/${q.supplierCompany.slug}`} variant="secondary" size="sm">
                  {tc("supplier")}
                </Button>
                <Button href={`/buyer/messages/new?supplier=${q.supplierCompany.slug}&rfq=${q.rfqId}`} variant="ghost" size="sm">
                  <MessageSquare /> {tc("negotiate")}
                </Button>
                <SaveButton
                  kind="supplier"
                  id={q.supplierCompany.id}
                  saved={savedIds.includes(q.supplierCompany.id)}
                  labelSave={tb("save")}
                  labelSaved={tb("saved")}
                  size="sm"
                  variant="ghost"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={tc("decision")} />
            <CardContent>
              <QuotationActions
                rfqId={q.rfqId}
                rfqStatus={q.rfq.status}
                locale={locale}
                tradeAssuranceDefault={tradeAssuranceDefault}
                countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
                defaultAddress={{
                  company: profile?.name,
                  phone: profile?.phone ?? undefined,
                  line1: profile?.address ?? undefined,
                  city: q.rfq.destinationCity ?? profile?.city ?? undefined,
                  postalCode: profile?.postalCode ?? undefined,
                  countryCode: q.rfq.destinationCountryCode ?? profile?.countryCode ?? undefined,
                }}
                quotation={{
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
                    city: q.supplierCompany.city,
                    countryCode: q.supplierCompany.countryCode,
                  },
                  badges,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-steel-600">{label}</dt>
      <dd className="tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
