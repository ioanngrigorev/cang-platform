import { CheckCircle2, Clock, FileText, MessageSquareWarning, Package, RefreshCw, Send, Undo2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import * as React from "react";
import { QuotationActions } from "@/components/seller/sales/quotation-actions";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatDateTime, formatMoney, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSellerQuotation } from "@/modules/seller/sales/quotations/queries";

export const metadata: Metadata = { title: "Quotation", robots: { index: false } };

type TimelineItem = { key: string; icon: React.ReactNode; tone: string; title: string; body?: string | null; at: Date };

export default async function SellerQuotationDetailPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { locale, id } = await params;
  const { saved } = await searchParams;
  const { company } = await requireCompany({ permission: "quotation.read", seller: true });
  const t = await getTranslations("sales.quotationDetail");
  const tf = await getTranslations("sales.quotations");

  const q = await getSellerQuotation(company.id, id);
  if (!q) notFound();

  const rfqOpen = q.rfq.status === "OPEN";
  const validityExpired = !!q.validUntil && q.validUntil.getTime() < Date.now();
  const canRevise = rfqOpen && q.isLatestRevision && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status);
  const canWithdraw = q.isLatestRevision && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status);
  const buyer = q.rfq.buyerCompany;

  const timeline: TimelineItem[] = [{ key: "created", icon: <FileText />, tone: "bg-steel-100 text-steel-600 ring-steel-200", title: t("timeline.created"), at: q.createdAt }];
  if (q.submittedAt) timeline.push({ key: "submitted", icon: <Send />, tone: "bg-info-50 text-info-700 ring-info-100", title: t("timeline.submitted"), at: q.submittedAt });
  for (const a of q.activity) {
    if (a.quotationId !== q.id) continue;
    if (a.kind === "quotation.revisionRequested") timeline.push({ key: a.id, icon: <MessageSquareWarning />, tone: "bg-warning-50 text-warning-700 ring-warning-100", title: t("timeline.revisionRequested"), body: a.message, at: a.createdAt });
    if (a.kind === "quotation.reject") timeline.push({ key: a.id, icon: <XCircle />, tone: "bg-danger-50 text-danger-700 ring-danger-100", title: t("timeline.rejected"), body: a.message, at: a.createdAt });
    if (a.kind === "quotation.withdraw") timeline.push({ key: a.id, icon: <Undo2 />, tone: "bg-steel-100 text-steel-600 ring-steel-200", title: t("timeline.withdrawn"), body: a.message, at: a.createdAt });
  }
  const child = q.revisions.find((r) => r.parentQuotationId === q.id);
  if (child) timeline.push({ key: `revised-${child.id}`, icon: <RefreshCw />, tone: "bg-brass-50 text-brass-700 ring-brass-200", title: t("timeline.revised", { number: child.quotationNumber }), at: child.createdAt });
  if (q.status === "ACCEPTED" && q.respondedAt) timeline.push({ key: "accepted", icon: <CheckCircle2 />, tone: "bg-success-50 text-success-700 ring-success-100", title: t("timeline.accepted"), at: q.respondedAt });
  if (q.status === "EXPIRED" && q.validUntil) timeline.push({ key: "expired", icon: <Clock />, tone: "bg-steel-100 text-steel-600 ring-steel-200", title: t("timeline.expired"), at: q.validUntil });
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: tf("title"), href: "/seller/quotations" },
          { label: q.quotationNumber },
        ]}
        eyebrow={q.quotationNumber}
        title={t("title", { number: q.quotationNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={q.status} label={tf(`status.${q.status}`)} />
            <span>{tf("revision", { n: q.revisionNumber })}</span>
            <Link href={`/seller/rfqs/${q.rfqId}`} className="hover:underline">
              {q.rfq.title}
            </Link>
          </span>
        }
        actions={<QuotationActions quotationId={q.id} rfqId={q.rfqId} buyerCompanyId={buyer.id} status={q.status} canRevise={canRevise} canWithdraw={canWithdraw} />}
      />

      {saved === "submitted" ? (
        <Alert variant="success" title={t("savedSubmittedTitle")} className="mb-6">
          {t("savedSubmittedBody", { buyer: buyer.name })}
        </Alert>
      ) : saved === "revised" ? (
        <Alert variant="success" title={t("savedRevisedTitle")} className="mb-6">
          {t("savedRevisedBody", { buyer: buyer.name })}
        </Alert>
      ) : saved === "draft" ? (
        <Alert variant="info" className="mb-6">
          {t("savedDraft")}
        </Alert>
      ) : null}

      {q.status === "DRAFT" ? (
        <Alert variant="info" title={t("draftTitle")} className="mb-6">
          {t("draftBody")}
        </Alert>
      ) : null}
      {q.revisionRequest && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status) ? (
        <Alert variant="warning" title={t("revisionRequestedTitle", { date: formatDate(q.revisionRequest.createdAt, locale) })} className="mb-6">
          <p className="whitespace-pre-line">{q.revisionRequest.message}</p>
          {canRevise ? (
            <Button href={`/seller/quotations/${q.id}/revise`} variant="primary" size="sm" className="mt-3">
              <RefreshCw /> {t("revise")}
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {q.status === "REJECTED" ? (
        <Alert variant="danger" title={t("rejectedTitle")} className="mb-6">
          {q.rejectionReason ?? t("rejectedNoReason")}
        </Alert>
      ) : null}
      {q.status === "ACCEPTED" && q.order ? (
        <Alert variant="success" title={t("acceptedTitle")} className="mb-6">
          {t("acceptedBody", { order: q.order.orderNumber })}{" "}
          <Link href={`/seller/orders/${q.order.id}`} className="font-medium underline">
            {t("viewOrder")}
          </Link>
        </Alert>
      ) : null}
      {q.hasNewerRevision ? (
        <Alert variant="info" title={t("supersededTitle")} className="mb-6">
          {t("supersededBody")}{" "}
          {child ? (
            <Link href={`/seller/quotations/${child.id}`} className="font-medium underline">
              {child.quotationNumber}
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {validityExpired && ["SUBMITTED", "UNDER_REVIEW"].includes(q.status) ? (
        <Alert variant="warning" className="mb-6">
          {t("validityExpired", { date: formatDate(q.validUntil!, locale) })}
        </Alert>
      ) : null}

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
              <dl className="space-y-2 border-t border-hairline px-5 py-4 text-sm">
                <Row label={t("subtotal")} value={formatMoney(q.subtotal, q.currency, locale)} />
                <Row label={t("shipping")} value={q.shippingCost > 0 ? formatMoney(q.shippingCost, q.currency, locale) : t("included")} />
                {q.discount > 0 ? <Row label={t("discount")} value={`− ${formatMoney(q.discount, q.currency, locale)}`} /> : null}
                <div className="flex items-center justify-between border-t border-hairline pt-2">
                  <dt className="font-semibold text-ink-900">{t("total")}</dt>
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
                  { label: t("moq"), value: q.moq ? formatNumber(q.moq, locale) : "—" },
                  { label: t("leadTime"), value: q.leadTimeDays ? t("days", { n: q.leadTimeDays }) : "—" },
                  { label: t("incoterm"), value: q.incoterm ?? "—" },
                  { label: t("shippingMethod"), value: q.shippingMethod ?? "—" },
                  { label: t("paymentTerms"), value: q.paymentTerms ?? "—" },
                  { label: t("validUntil"), value: q.validUntil ? <span className={validityExpired ? "text-danger-600" : undefined}>{formatDate(q.validUntil, locale)}</span> : "—" },
                  { label: t("sample"), value: q.sampleAvailable ? (q.samplePrice ? t("sampleFor", { price: formatMoney(q.samplePrice, q.currency, locale) }) : t("sampleYes")) : t("sampleNo") },
                  { label: t("productionNote"), value: q.productionTimeNote ?? "—" },
                ]}
              />
              {q.notes ? (
                <div className="mt-4 border-t border-hairline pt-4">
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
                        <Link href={`/seller/quotations/${r.id}`} className="font-medium text-ink-900 hover:underline">
                          {r.quotationNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {tf("revision", { n: r.revisionNumber })} · {formatDate(r.submittedAt ?? r.createdAt, locale)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-steel-600">{formatMoney(r.total, r.currency, locale)}</span>
                        {r.id === q.id ? (
                          <Badge variant="ink" size="sm">
                            {t("current")}
                          </Badge>
                        ) : (
                          <StatusBadge status={r.status} label={tf(`status.${r.status}`)} size="sm" />
                        )}
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
            <CardHeader title={t("buyer")} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={buyer.logoUrl} name={buyer.name} size={44} square />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                    {buyer.name} <VerifiedMark status={buyer.verificationStatus} />
                  </p>
                  <p className="text-xs text-steel-500">{[buyer.city, buyer.countryCode].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <DataList
                columns={1}
                items={[
                  { label: t("rfq"), value: <Link href={`/seller/rfqs/${q.rfqId}`} className="text-ink-900 hover:underline">{q.rfq.rfqNumber}</Link> },
                  { label: t("rfqQuantity"), value: `${formatNumber(q.rfq.quantity, locale)} ${q.rfq.unit}` },
                  { label: t("rfqTarget"), value: q.rfq.targetPrice ? formatMoney(q.rfq.targetPrice, q.rfq.targetCurrency, locale, { maxFractionDigits: 4 }) : "—" },
                  { label: t("rfqDestination"), value: [q.rfq.destinationCity, q.rfq.destinationCountry ? localized(q.rfq.destinationCountry, "name", locale) : null].filter(Boolean).join(", ") || "—" },
                  { label: t("rfqStatus"), value: <StatusBadge status={q.rfq.status} size="sm" /> },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("statusTimeline")} />
            <CardContent>
              <ol className="relative space-y-5 pl-1">
                {timeline.map((e, i) => (
                  <li key={e.key} className="relative flex gap-3">
                    {i < timeline.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-steel-200" aria-hidden /> : null}
                    <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 [&_svg]:size-4", e.tone)}>{e.icon}</span>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm font-medium text-ink-900">{e.title}</p>
                      {e.body ? <p className="mt-0.5 whitespace-pre-line text-sm text-steel-600">{e.body}</p> : null}
                      <p className="mt-0.5 text-xs text-steel-500">{formatDateTime(e.at, locale)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {q.order ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <span className="flex items-center gap-2 text-sm text-steel-600">
                  <Package className="size-4" /> {q.order.orderNumber}
                </span>
                <Button href={`/seller/orders/${q.order.id}`} variant="secondary" size="sm">
                  {t("viewOrder")}
                </Button>
              </CardContent>
            </Card>
          ) : null}
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
