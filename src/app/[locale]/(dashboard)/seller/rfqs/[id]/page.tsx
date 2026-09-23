import { FileText, MessageSquare, Receipt, Send } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSellerRfq, markInvitationViewed } from "@/modules/seller/sales/rfqs";

export const metadata: Metadata = { title: "RFQ", robots: { index: false } };

export default async function SellerRfqDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "rfq.read", seller: true });
  const t = await getTranslations("sales.rfqDetail");

  const rfq = await getSellerRfq(company.id, id);
  if (!rfq) notFound();
  if (rfq.invitation?.status === "PENDING") await markInvitationViewed(company.id, rfq.id);

  const deadline = rfq.quoteDeadline ?? rfq.expiresAt;
  const deadlinePassed = !!deadline && deadline.getTime() < Date.now();
  const canQuote = rfq.status === "OPEN" && !deadlinePassed;
  const live = rfq.liveQuotation;
  const buyer = rfq.buyerCompany;
  const messageHref = `/seller/messages/new?rfq=${rfq.id}&company=${buyer.id}`;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("backToList"), href: "/seller/rfqs" },
          { label: rfq.rfqNumber },
        ]}
        eyebrow={rfq.rfqNumber}
        title={rfq.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rfq.status} label={t(`status.${rfq.status}`)} />
            <span>
              {formatNumber(rfq.quantity, locale)} {rfq.unit}
            </span>
            {rfq.category ? <span>· {localized(rfq.category, "name", locale)}</span> : null}
            {rfq.publishedAt ? <span>· {t("published", { date: formatDate(rfq.publishedAt, locale) })}</span> : null}
          </span>
        }
        actions={
          <>
            <Button href={messageHref} variant="secondary">
              <MessageSquare /> {t("messageBuyer")}
            </Button>
            {live ? (
              <Button href={`/seller/quotations/${live.id}`} variant="primary">
                <Receipt /> {live.status === "DRAFT" ? t("continueDraft") : t("viewQuotation")}
              </Button>
            ) : canQuote ? (
              <Button href={`/seller/quotations/new?rfq=${rfq.id}`} variant="primary">
                <Send /> {t("sendQuotation")}
              </Button>
            ) : null}
          </>
        }
      />

      {rfq.invitation && rfq.invitation.status !== "DECLINED" ? (
        <Alert variant="info" title={t("invitedTitle")} className="mb-6">
          {t("invitedBody", { buyer: buyer.name })}
        </Alert>
      ) : null}
      {!canQuote ? (
        <Alert variant="warning" title={t("closedTitle")} className="mb-6">
          {rfq.status === "AWARDED" ? t("closedAwarded") : deadlinePassed && rfq.status === "OPEN" ? t("closedDeadline") : t("closedBody")}
        </Alert>
      ) : null}
      {live && live.status !== "DRAFT" ? (
        <Alert variant="success" title={t("quotedTitle", { number: live.quotationNumber })} className="mb-6">
          {t("quotedBody", { status: humanize(live.status).toLowerCase() })}{" "}
          <Link href={`/seller/quotations/${live.id}`} className="font-medium underline">
            {t("viewQuotation")}
          </Link>
        </Alert>
      ) : null}

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
              <CardHeader title={t("lineItems")} description={t("lineItemsHint")} />
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
                            {i.specifications ? <p className="mt-0.5 whitespace-pre-line text-xs text-steel-500">{i.specifications}</p> : null}
                            {i.notes ? <p className="mt-0.5 text-xs italic text-steel-500">{i.notes}</p> : null}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-steel-600">
                            {formatNumber(i.quantity, locale)} {i.unit}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums text-steel-600">{i.targetPrice ? formatMoney(i.targetPrice, rfq.targetCurrency, locale, { maxFractionDigits: 4 }) : "—"}</td>
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
                      <span className="shrink-0 text-xs text-steel-500">
                        {humanize(d.type)} · {(d.sizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("buyer")} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={buyer.logoUrl} name={buyer.name} size={44} square />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                    {buyer.name} <VerifiedMark status={buyer.verificationStatus} />
                  </p>
                  <p className="text-xs text-steel-500">{[buyer.city, buyer.country ? localized(buyer.country, "name", locale) : buyer.countryCode].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <DataList
                columns={1}
                items={[
                  { label: t("buyerType"), value: humanize(buyer.businessType) },
                  { label: t("buyerVerification"), value: <StatusBadge status={buyer.verificationStatus} size="sm" /> },
                  { label: t("buyerOrders"), value: formatNumber(buyer.transactionCount, locale) },
                  ...(buyer.yearEstablished ? [{ label: t("buyerSince"), value: String(buyer.yearEstablished) }] : []),
                ]}
              />
              <Button href={messageHref} variant="ghost" size="sm">
                <MessageSquare /> {t("messageBuyer")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("terms")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("quantity"), value: `${formatNumber(rfq.quantity, locale)} ${rfq.unit}` },
                  { label: t("targetPrice"), value: rfq.targetPrice ? formatMoney(rfq.targetPrice, rfq.targetCurrency, locale, { maxFractionDigits: 4 }) : "—" },
                  { label: t("destination"), value: [rfq.destinationCity, rfq.destinationCountry ? localized(rfq.destinationCountry, "name", locale) : null].filter(Boolean).join(", ") || "—" },
                  { label: t("incoterm"), value: rfq.incoterm ?? "—" },
                  { label: t("paymentTerms"), value: rfq.preferredPaymentTerms ?? "—" },
                  { label: t("quoteDeadline"), value: deadline ? <span className={deadlinePassed ? "text-danger-600" : undefined}>{formatDate(deadline, locale)}</span> : "—" },
                  { label: t("requiredDelivery"), value: rfq.requiredDeliveryDate ? formatDate(rfq.requiredDeliveryDate, locale) : "—" },
                  { label: t("sample"), value: rfq.sampleRequired ? t("sampleYes") : t("sampleNo") },
                  { label: t("competition"), value: t("competitionValue", { count: rfq.quotationCount }) },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("yourQuotations")} action={<Receipt className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {rfq.myQuotations.length === 0 ? (
                <div className="space-y-3 px-5 py-4">
                  <p className="text-sm text-steel-500">{canQuote ? t("noQuotationYet") : t("noQuotation")}</p>
                  {canQuote ? (
                    <Button href={`/seller/quotations/new?rfq=${rfq.id}`} variant="primary" size="sm">
                      <Send /> {t("sendQuotation")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {rfq.myQuotations.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={`/seller/quotations/${q.id}`} className="text-sm font-medium text-ink-900 hover:underline">
                          {q.quotationNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {t("revision", { n: q.revisionNumber })} · {formatDate(q.submittedAt ?? q.createdAt, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm tabular-nums text-ink-900">{formatMoney(q.total, q.currency, locale)}</span>
                        <StatusBadge status={q.status} size="sm" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {rfq.invitation ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
                <span className="text-steel-600">{t("invitationStatus")}</span>
                <Badge variant={rfq.invitation.status === "QUOTED" ? "success" : rfq.invitation.status === "DECLINED" ? "neutral" : "brass"}>{t(`invitation.${rfq.invitation.status}`)}</Badge>
              </CardContent>
            </Card>
          ) : null}
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
