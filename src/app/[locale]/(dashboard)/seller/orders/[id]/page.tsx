import { ClipboardCheck, FileText, Landmark, MessageSquare, Receipt, ShieldAlert, ShieldCheck, Star, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { shipmentStatusLabels } from "@/modules/logistics/tracking/labels";
import { listActiveProviders } from "@/modules/logistics/tracking/queries";
import { SellerOrderActions } from "@/components/seller/sales/order-actions";
import { CreateShipmentButton } from "@/components/seller/sales/shipment-actions";
import { Alert, Avatar, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, RatingStars, StatusBadge, TBody, TD, TH, THead, TR, Table, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSellerOrder, orderStatusList } from "@/modules/orders/queries";
import { supplierNextStatuses } from "@/modules/orders/service";
import { SHIPPABLE_ORDER_STATUSES } from "@/modules/seller/sales/shipments/schemas";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const OPEN_DISPUTE_STATUSES = ["OPEN", "AWAITING_RESPONSE", "UNDER_REVIEW", "MEDIATION"];

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "orders.read", seller: true });
  const t = await getTranslations("sales.orderDetail");
  const to = await getTranslations("sales.orders");
  const ts = await getTranslations("orders.shipments");
  const statusLabels = await shipmentStatusLabels();
  const providers = await listActiveProviders();

  const order = await getSellerOrder(company.id, id);
  if (!order) notFound();

  const statuses = await orderStatusList();
  const currentStatus = statuses.find((s) => s.code === order.statusCode);
  const nextStatuses = supplierNextStatuses(order.statusCode, currentStatus?.allowedTransitions);
  const openDispute = order.disputes.find((d) => OPEN_DISPUTE_STATUSES.includes(d.status));
  const review = order.reviews[0];
  const buyer = order.buyerCompany;
  const held = order.payments.filter((p) => p.escrowStatus === "HELD" || p.escrowStatus === "PARTIALLY_RELEASED").reduce((s, p) => s + p.amount, 0);
  const received = order.payments.filter((p) => p.status === "PAID" || p.status === "SETTLED").reduce((s, p) => s + p.amount, 0);
  const milestoneLabels = Object.fromEntries(["FACTORY", "PICKUP", "WAREHOUSE", "ORIGIN_PORT", "DEPARTED", "IN_TRANSIT", "DESTINATION_PORT", "CUSTOMS", "LAST_MILE", "DELIVERED"].map((m) => [m, ts(`milestoneLabels.${m}`)]));
  const addr = order.shippingAddress;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: to("title"), href: "/seller/orders" },
          { label: order.orderNumber },
        ]}
        eyebrow={order.orderNumber}
        title={buyer.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.statusCode} label={order.status ? localized(order.status, "name", locale) : undefined} />
            <span className="font-medium text-ink-900">{formatMoney(order.total, order.currency, locale)}</span>
            {order.placedAt ? <span>· {t("placedOn", { date: formatDate(order.placedAt, locale) })}</span> : null}
          </span>
        }
        actions={
          <Button href={`/seller/messages/new?order=${order.id}&company=${buyer.id}`} variant="secondary">
            <MessageSquare /> {t("messageBuyer")}
          </Button>
        }
      />

      <Alert variant={order.statusCode === "DISPUTED" ? "danger" : order.statusCode === "COMPLETED" ? "success" : order.statusCode === "CANCELLED" ? "warning" : "info"} title={t("whatsNext")} className="mb-6">
        {to(`next.${order.statusCode}`)}
      </Alert>

      {openDispute ? (
        <Alert variant="danger" title={t("disputeOpen")} className="mb-6">
          <p>{openDispute.title}</p>
          <Button href={`/seller/disputes/${openDispute.id}`} variant="secondary" size="sm" className="mt-2">
            <ShieldAlert /> {t("viewDispute")}
          </Button>
        </Alert>
      ) : null}

      <div className="mb-6">
        <SellerOrderActions
          orderId={order.id}
          statusCode={order.statusCode}
          nextStatuses={nextStatuses}
          isCancellable={currentStatus?.isCancellable ?? false}
          hasShipment={order.shipments.length > 0}
          hasOpenDispute={!!openDispute}
          canDispute={(currentStatus?.allowedTransitions ?? []).includes("DISPUTED")}
          currency={order.currency}
          providers={providers}
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
                      <TD>
                        <p className="font-medium text-ink-900">{i.description}</p>
                        {i.specifications && Object.keys(i.specifications).length ? (
                          <p className="mt-0.5 text-xs text-steel-500">
                            {Object.entries(i.specifications)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </TD>
                      <TD className="whitespace-nowrap text-steel-600">
                        {formatNumber(i.quantity, locale)} {i.unit}
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums">{formatMoney(i.unitPrice, order.currency, locale, { maxFractionDigits: 4 })}</TD>
                      <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(i.total, order.currency, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <dl className="space-y-2 border-t border-hairline px-5 py-4 text-sm">
                <SumRow label={t("subtotal")} value={formatMoney(order.subtotal, order.currency, locale)} />
                {order.shippingCost > 0 ? <SumRow label={t("shipping")} value={formatMoney(order.shippingCost, order.currency, locale)} /> : null}
                {order.taxAmount > 0 ? <SumRow label={t("tax")} value={formatMoney(order.taxAmount, order.currency, locale)} /> : null}
                {order.discount > 0 ? <SumRow label={t("discount")} value={`− ${formatMoney(order.discount, order.currency, locale)}`} /> : null}
                <div className="flex items-center justify-between border-t border-hairline pt-2">
                  <dt className="font-semibold text-ink-900">{t("total")}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums text-ink-900">{formatMoney(order.total, order.currency, locale)}</dd>
                </div>
                {order.platformFee > 0 ? <SumRow label={t("platformFee")} value={`− ${formatMoney(order.platformFee, order.currency, locale)}`} muted /> : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("payments")} description={t("paymentsHint")} />
            <CardContent className="p-0">
              {order.payments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noPayments")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("paymentMilestone")}</TH>
                      <TH>{t("paymentAmount")}</TH>
                      <TH className="hidden sm:table-cell">{t("paymentMethod")}</TH>
                      <TH>{t("paymentStatus")}</TH>
                      <TH className="hidden md:table-cell">{t("paymentEscrow")}</TH>
                      <TH className="hidden lg:table-cell">{t("paymentDate")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {order.payments.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <p className="font-medium text-ink-900">{p.milestoneLabel ?? humanize(p.kind)}</p>
                          <p className="text-xs text-steel-500">{p.paymentNumber}</p>
                        </TD>
                        <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(p.amount, p.currency, locale)}</TD>
                        <TD className="hidden text-steel-600 sm:table-cell">{p.provider?.name ?? humanize(p.method)}</TD>
                        <TD>
                          <StatusBadge status={p.status} size="sm" />
                        </TD>
                        <TD className="hidden md:table-cell">{p.escrowStatus === "NOT_APPLICABLE" ? <span className="text-steel-400">—</span> : <StatusBadge status={p.escrowStatus} size="sm" />}</TD>
                        <TD className="hidden whitespace-nowrap text-xs text-steel-500 lg:table-cell">
                          {p.releasedAt ? t("releasedOn", { date: formatDate(p.releasedAt, locale) }) : p.paidAt ? t("paidOn", { date: formatDate(p.paidAt, locale) }) : p.dueAt ? t("dueOn", { date: formatDate(p.dueAt, locale) }) : "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              {order.invoices.length ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-3 text-sm">
                  <span className="text-steel-600">{t("invoices")}:</span>
                  {order.invoices.map((i) => (
                    <Link key={i.id} href={`/seller/invoices/${i.id}`} className="inline-flex items-center gap-1 font-medium text-ink-900 hover:underline">
                      <Receipt className="size-3.5 text-steel-400" /> {i.invoiceNumber}
                      <StatusBadge status={i.status} size="sm" />
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title={t("shipments")}
              action={SHIPPABLE_ORDER_STATUSES.includes(order.statusCode) ? <CreateShipmentButton orders={[{ id: order.id, orderNumber: order.orderNumber }]} providers={providers} defaultOrderId={order.id} size="sm" /> : undefined}
            />
            <CardContent className="space-y-5">
              {order.shipments.length === 0 ? (
                <p className="text-sm text-steel-500">{SHIPPABLE_ORDER_STATUSES.includes(order.statusCode) ? t("noShipmentsYet") : t("noShipments")}</p>
              ) : (
                order.shipments.map((s) => (
                  <div key={s.id} className="rounded-lg border border-hairline p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/seller/shipments/${s.id}`} className="font-medium text-ink-900 hover:underline">
                          {s.shipmentNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {s.carrier ?? s.provider?.name ?? "—"}
                          {s.trackingNumber ? ` · ${t("tracking")} ${s.trackingNumber}` : ""}
                          {s.eta ? ` · ${t("eta")} ${formatDate(s.eta, locale)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={s.status} label={statusLabels[s.status]} />
                    </div>
                    <ShipmentStepper status={s.status} mode={s.mode} events={s.events} locale={locale} labels={statusLabels} orientation="horizontal" />
                    <Button href={`/seller/shipments/${s.id}`} variant="ghost" size="sm" className="mt-3">
                      <Truck /> {t("manageShipment")}
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
            <CardHeader title={t("buyer")} />
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={buyer.logoUrl} name={buyer.name} size={44} square />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                    {buyer.name} <VerifiedMark status={buyer.verificationStatus} />
                  </p>
                  <p className="text-xs text-steel-500">{[buyer.city, buyer.country ? localized(buyer.country, "name", locale) : buyer.countryCode].filter(Boolean).join(", ")}</p>
                  {buyer.ratingCount > 0 ? <RatingStars value={buyer.ratingAvg} count={buyer.ratingCount} className="mt-1" /> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={`/seller/messages/new?order=${order.id}&company=${buyer.id}`} variant="secondary" size="sm">
                  <MessageSquare /> {t("messageBuyer")}
                </Button>
                {order.rfq ? (
                  <Button href={`/seller/rfqs/${order.rfq.id}`} variant="ghost" size="sm">
                    {t("viewRfq")}
                  </Button>
                ) : null}
                {order.quotation ? (
                  <Button href={`/seller/quotations/${order.quotation.id}`} variant="ghost" size="sm">
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
                  { label: t("received"), value: formatMoney(received, order.currency, locale) },
                  { label: t("heldInEscrow"), value: held > 0 ? formatMoney(held, order.currency, locale) : "—" },
                  { label: t("expectedShip"), value: order.expectedShipDate ? formatDate(order.expectedShipDate, locale) : "—" },
                  { label: t("expectedDelivery"), value: order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate, locale) : "—" },
                  { label: t("shippingAddress"), value: addr ? [addr.company, addr.contactName, addr.line1, addr.line2, `${addr.postalCode ?? ""} ${addr.city}`.trim(), addr.countryCode, addr.phone].filter(Boolean).join(", ") : "—" },
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
              {order.tradeAssuranceEnabled ? <p className="text-sm text-steel-600">{t("tradeAssuranceHint")}</p> : null}
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
                    <li key={i.id} className="flex items-start justify-between gap-2 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{humanize(i.type)}</p>
                        <p className="text-xs text-steel-500">
                          {i.provider?.name ?? "—"}
                          {i.scheduledAt ? ` · ${formatDate(i.scheduledAt, locale)}` : i.requestedDate ? ` · ${formatDate(i.requestedDate, locale)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={i.status} size="sm" />
                        {i.result !== "PENDING" ? <StatusBadge status={i.result} size="sm" /> : null}
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
                        {humanize(d.type)} · {d.ownerCompanyId === company.id ? t("docOurs") : t("docTheirs")} · {formatDateTime(d.createdAt, locale)}
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
                      <Link href={`/seller/financing/${f.id}`} className="font-medium text-ink-900 hover:underline">
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
              <Button href={`/seller/financing?order=${order.id}`} variant="secondary" size="sm">
                <Landmark /> {t("financingCta")}
              </Button>
            </CardContent>
          </Card>

          {review ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <span className="flex items-center gap-2 text-sm text-steel-600">
                  <Star className="size-4 text-brass-500" /> {review.reply ? t("reviewAnswered") : t("reviewReceived")}
                </span>
                <Button href="/seller/reviews" variant="ghost" size="sm">
                  {Number(review.ratingOverall).toFixed(1)} ★
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function SumRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-xs text-steel-500" : "text-steel-600"}>{label}</dt>
      <dd className={muted ? "text-xs tabular-nums text-steel-500" : "tabular-nums text-ink-900"}>{value}</dd>
    </div>
  );
}
