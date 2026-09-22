import { ClipboardCheck, FileText, Landmark, MessageSquare, ShieldAlert, ShieldCheck, Star, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { InvoiceLinks, PaymentSchedule } from "@/components/orders/payment-schedule";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { activeInspectionProviders } from "@/modules/inspection/queries";
import { getBuyerOrder, orderStatusList } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const OPEN_DISPUTE_STATUSES = ["OPEN", "AWAITING_RESPONSE", "UNDER_REVIEW", "MEDIATION"];

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("orders.detail");
  const ts = await getTranslations("orders.shipments");

  const order = await getBuyerOrder(company.id, id);
  if (!order) notFound();

  const [statuses, inspectionProviders] = await Promise.all([orderStatusList(), activeInspectionProviders("VN")]);
  const currentStatus = statuses.find((s) => s.code === order.statusCode);
  const heldPayments = order.payments.filter((p) => p.escrowStatus === "HELD" || p.escrowStatus === "PARTIALLY_RELEASED").length;
  const openDispute = order.disputes.find((d) => OPEN_DISPUTE_STATUSES.includes(d.status));
  const review = order.reviews[0];
  const milestoneLabels = {
    FACTORY: ts("milestoneLabels.FACTORY"),
    PICKUP: ts("milestoneLabels.PICKUP"),
    WAREHOUSE: ts("milestoneLabels.WAREHOUSE"),
    ORIGIN_PORT: ts("milestoneLabels.ORIGIN_PORT"),
    DEPARTED: ts("milestoneLabels.DEPARTED"),
    IN_TRANSIT: ts("milestoneLabels.IN_TRANSIT"),
    DESTINATION_PORT: ts("milestoneLabels.DESTINATION_PORT"),
    CUSTOMS: ts("milestoneLabels.CUSTOMS"),
    LAST_MILE: ts("milestoneLabels.LAST_MILE"),
    DELIVERED: ts("milestoneLabels.DELIVERED"),
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("backToList"), href: "/buyer/orders" },
          { label: order.orderNumber },
        ]}
        eyebrow={order.orderNumber}
        title={order.supplierCompany.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.statusCode} label={order.status ? localized(order.status, "name", locale) : undefined} />
            <span className="font-medium text-ink-900">{formatMoney(order.total, order.currency, locale)}</span>
            {order.placedAt ? <span>· {t("placedOn", { date: formatDate(order.placedAt, locale) })}</span> : null}
          </span>
        }
        actions={
          <>
            <Button href={`/buyer/messages/new?supplier=${order.supplierCompany.slug}&order=${order.id}`} variant="secondary">
              <MessageSquare /> {t("messageSupplier")}
            </Button>
            {order.statusCode === "COMPLETED" && !review ? (
              <Button href={`/buyer/reviews/new?order=${order.id}`} variant="accent">
                <Star /> {t("reviewCta")}
              </Button>
            ) : null}
          </>
        }
      />

      <Alert variant={order.statusCode === "DISPUTED" ? "danger" : order.statusCode === "COMPLETED" ? "success" : "info"} title={t("whatsNext")} className="mb-6">
        {t(`next.${order.statusCode}`)}
      </Alert>

      {openDispute ? (
        <Alert variant="danger" title={t("disputeOpen")} className="mb-6">
          <p>{openDispute.title}</p>
          <Button href={`/buyer/disputes/${openDispute.id}`} variant="secondary" size="sm" className="mt-2">
            <ShieldAlert /> {t("viewDispute")}
          </Button>
        </Alert>
      ) : null}

      <div className="mb-6">
        <OrderActions
          orderId={order.id}
          statusCode={order.statusCode}
          allowedTransitions={currentStatus?.allowedTransitions ?? []}
          isCancellable={currentStatus?.isCancellable ?? false}
          currency={order.currency}
          heldPayments={heldPayments}
          inspectionProviders={inspectionProviders.map((p) => ({ id: p.id, name: p.name }))}
          factoryAddress={order.supplierCompany.manufacturerProfile?.factoryAddress ?? null}
          hasOpenDispute={!!openDispute}
        />
      </div>

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
                  {order.items.map((i) => (
                    <TR key={i.id}>
                      <TD className="font-medium">{i.description}</TD>
                      <TD className="whitespace-nowrap text-steel-600">
                        {formatNumber(i.quantity, locale)} {i.unit}
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums">{formatMoney(i.unitPrice, order.currency, locale, { maxFractionDigits: 4 })}</TD>
                      <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(i.total, order.currency, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <dl className="space-y-2 border-t border-steel-100 px-5 py-4 text-sm">
                <SumRow label={t("subtotal")} value={formatMoney(order.subtotal, order.currency, locale)} />
                {order.shippingCost > 0 ? <SumRow label={t("shipping")} value={formatMoney(order.shippingCost, order.currency, locale)} /> : null}
                {order.taxAmount > 0 ? <SumRow label={t("tax")} value={formatMoney(order.taxAmount, order.currency, locale)} /> : null}
                {order.discount > 0 ? <SumRow label={t("discount")} value={`− ${formatMoney(order.discount, order.currency, locale)}`} /> : null}
                <div className="flex items-center justify-between border-t border-steel-100 pt-2">
                  <dt className="font-semibold text-ink-900">{t("total")}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums text-ink-900">{formatMoney(order.total, order.currency, locale)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("payments")} />
            <CardContent>
              <PaymentSchedule
                locale={locale}
                demoMode={process.env.NODE_ENV !== "production"}
                payments={order.payments.map((p) => ({
                  id: p.id,
                  paymentNumber: p.paymentNumber,
                  kind: p.kind,
                  status: p.status,
                  escrowStatus: p.escrowStatus,
                  currency: p.currency,
                  amount: p.amount,
                  milestoneLabel: p.milestoneLabel,
                  dueAt: p.dueAt ? p.dueAt.toISOString() : null,
                  paidAt: p.paidAt ? p.paidAt.toISOString() : null,
                  instructions: p.instructions,
                  provider: p.provider ? { id: p.provider.id, name: p.provider.name, code: p.provider.code } : null,
                }))}
              />
              <InvoiceLinks
                label={t("invoices")}
                locale={locale}
                invoices={order.invoices.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, total: i.total, currency: i.currency, status: i.status }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title={t("shipments")}
              action={
                <Button href={`/buyer/logistics/new?order=${order.id}`} variant="secondary" size="sm">
                  <Truck /> {t("bookLogistics")}
                </Button>
              }
            />
            <CardContent className="space-y-5">
              {order.shipments.length === 0 ? (
                <div>
                  <p className="text-sm text-steel-500">{t("noShipments")}</p>
                  <p className="mt-1 text-xs text-steel-500">{t("logisticsHint")}</p>
                </div>
              ) : (
                order.shipments.map((s) => (
                  <div key={s.id} className="rounded-md border border-steel-200 p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/buyer/shipments/${s.id}`} className="font-medium text-ink-900 hover:underline">
                          {s.shipmentNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {s.carrier ?? s.provider?.name ?? "—"}
                          {s.trackingNumber ? ` · ${t("trackingNumber")} ${s.trackingNumber}` : ""}
                          {s.eta ? ` · ${t("eta")} ${formatDate(s.eta, locale)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <ShipmentStepper status={s.status} events={s.events} locale={locale} labels={milestoneLabels} orientation="horizontal" />
                    <Button href={`/buyer/shipments/${s.id}`} variant="ghost" size="sm" className="mt-3">
                      {t("viewShipment")}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("timeline")} />
            <CardContent>
              <OrderTimeline events={order.events} locale={locale} emptyLabel={t("timelineEmpty")} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("supplier")} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={order.supplierCompany.logoUrl} name={order.supplierCompany.name} size={44} square />
                <div className="min-w-0">
                  <Link href={`/supplier/${order.supplierCompany.slug}`} className="font-semibold text-ink-900 hover:underline">
                    {order.supplierCompany.name}
                  </Link>
                  <p className="text-xs text-steel-500">{[order.supplierCompany.city, order.supplierCompany.countryCode].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.rfq ? (
                  <Button href={`/buyer/rfqs/${order.rfq.id}`} variant="ghost" size="sm">
                    {t("viewRfq")}
                  </Button>
                ) : null}
                {order.quotation ? (
                  <Button href={`/buyer/quotations/${order.quotation.id}`} variant="ghost" size="sm">
                    {t("viewQuotation")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("terms")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("incoterm"), value: order.incoterm ?? "—" },
                  { label: t("paymentTerms"), value: order.paymentTerms ?? "—" },
                  { label: t("deposit"), value: order.depositPercent ? `${order.depositPercent}%` : "—" },
                  { label: t("expectedShip"), value: order.expectedShipDate ? formatDate(order.expectedShipDate, locale) : "—" },
                  { label: t("expectedDelivery"), value: order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate, locale) : "—" },
                  {
                    label: t("shippingAddress"),
                    value: order.shippingAddress
                      ? [order.shippingAddress.company, order.shippingAddress.line1, order.shippingAddress.line2, `${order.shippingAddress.postalCode ?? ""} ${order.shippingAddress.city}`.trim(), order.shippingAddress.countryCode]
                          .filter(Boolean)
                          .join(", ")
                      : "—",
                  },
                  ...(order.buyerNotes ? [{ label: t("buyerNotes"), value: order.buyerNotes }] : []),
                ]}
              />
            </CardContent>
          </Card>

          <Card className={order.tradeAssuranceEnabled ? "border-success-200" : undefined}>
            <CardHeader title={t("tradeAssurance")} />
            <CardContent className="space-y-2">
              <Badge variant={order.tradeAssuranceEnabled ? "success" : "neutral"}>
                <ShieldCheck className="size-3" /> {order.tradeAssuranceEnabled ? t("tradeAssuranceOn") : t("tradeAssuranceOff")}
              </Badge>
              {order.tradeAssuranceEnabled ? (
                <>
                  <p className="text-sm text-steel-600">{t("tradeAssuranceHint")}</p>
                  {Array.isArray(order.tradeAssuranceTerms?.coverage) ? (
                    <ul className="list-inside list-disc text-sm text-steel-600">
                      {(order.tradeAssuranceTerms!.coverage as string[]).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                  {typeof order.tradeAssuranceTerms?.inspectionWindowDays === "number" ? (
                    <p className="text-xs text-steel-500">{t("inspectionWindow", { days: order.tradeAssuranceTerms.inspectionWindowDays as number })}</p>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("inspections")} action={<ClipboardCheck className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {order.inspections.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noInspections")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {order.inspections.map((i) => (
                    <li key={i.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/buyer/inspections/${i.id}`} className="text-sm font-medium text-ink-900 hover:underline">
                            {humanize(i.type)}
                          </Link>
                          <p className="text-xs text-steel-500">
                            {i.provider?.name ?? "—"}
                            {i.scheduledAt ? ` · ${formatDate(i.scheduledAt, locale)}` : i.requestedDate ? ` · ${formatDate(i.requestedDate, locale)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={i.status} size="sm" />
                          {i.result !== "PENDING" ? <StatusBadge status={i.result} size="sm" /> : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("documents")} action={<FileText className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {order.documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noDocuments")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {order.documents.map((d) => (
                    <li key={d.id} className="px-5 py-3">
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink-900 hover:underline">
                        {d.name}
                      </a>
                      <p className="text-xs text-steel-500">
                        {humanize(d.type)} · {formatDateTime(d.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("financing")} action={<Landmark className="size-4 text-steel-400" />} />
            <CardContent className="space-y-2">
              {order.financingApplications.length ? (
                <ul className="space-y-2">
                  {order.financingApplications.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/buyer/financing/${f.id}`} className="font-medium text-ink-900 hover:underline">
                        {f.applicationNumber}
                      </Link>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-steel-600">{formatMoney(f.amount, f.currency, locale)}</span>
                        <StatusBadge status={f.status} size="sm" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-steel-600">{t("financingHint")}</p>
              )}
              <Button href={`/buyer/financing/new?order=${order.id}`} variant="secondary" size="sm">
                <Landmark /> {t("financingCta")}
              </Button>
            </CardContent>
          </Card>

          {review ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <span className="text-sm text-steel-600">{t("reviewDone")}</span>
                <Badge variant="success">{Number(review.ratingOverall).toFixed(1)} ★</Badge>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-steel-600">{label}</dt>
      <dd className="tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
