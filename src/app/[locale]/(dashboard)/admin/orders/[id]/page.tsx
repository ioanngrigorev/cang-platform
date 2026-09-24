import { EyeOff, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonDetails } from "@/components/admin/json-details";
import { OrderAdminActions } from "@/components/admin/order-actions";
import { PaymentAdminButtons } from "@/components/admin/payment-actions";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { shipmentStatusLabels } from "@/modules/logistics/tracking/labels";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { getAdminOrder } from "@/modules/admin/orders/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";
import { orderStatusList } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.orders.read");
  const t = await getTranslations("admin.orders");
  const tc = await getTranslations("admin.common");
  const ts = await getTranslations("orders.shipments");
  const statusLabels = await shipmentStatusLabels();
  const [order, statuses] = await Promise.all([getAdminOrder(id), orderStatusList()]);
  if (!order) notFound();
  const canWrite = canPlatform(auth, "admin.orders.write");
  const canPay = canPlatform(auth, "admin.payments.write");
  const milestoneLabels = Object.fromEntries(["FACTORY", "PICKUP", "WAREHOUSE", "ORIGIN_PORT", "DEPARTED", "IN_TRANSIT", "DESTINATION_PORT", "CUSTOMS", "LAST_MILE", "DELIVERED"].map((m) => [m, ts(`milestoneLabels.${m}`)]));
  const company = (c: { id: string; name: string; countryCode: string; verificationStatus: string }) => (
    <span className="flex flex-wrap items-center gap-1.5">
      <Link href={`/admin/companies/${c.id}`} className="font-medium text-ink-900 hover:underline">
        {c.name}
      </Link>
      <span className="text-xs text-steel-500">{c.countryCode}</span>
      <StatusBadge status={c.verificationStatus} label={tc(`verification.${c.verificationStatus}`)} size="sm" />
    </span>
  );

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/orders" }, { label: order.orderNumber }]}
        eyebrow={order.orderNumber}
        title={`${order.buyerCompany.name} → ${order.supplierCompany.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.statusCode} label={order.status ? localized(order.status, "name", locale) : undefined} />
            <span className="font-medium text-ink-900">{formatMoney(order.total, order.currency, locale)}</span>
            {order.tradeAssuranceEnabled ? (
              <Badge variant="success">
                <ShieldCheck className="size-3" /> {t("tradeAssurance")}
              </Badge>
            ) : null}
            {order.placedAt ? <span>· {formatDateTime(order.placedAt, locale)}</span> : null}
          </span>
        }
        actions={<OrderAdminActions orderId={order.id} statusCode={order.statusCode} statuses={statuses.map((s) => ({ code: s.code, name: localized(s, "name", locale) }))} canWrite={canWrite} />}
      />

      {order.cancellationReason ? (
        <Alert variant="warning" title={t("cancellationReason")} className="mb-6">
          {order.cancellationReason}
        </Alert>
      ) : null}
      {order.disputes.length ? (
        <Alert variant={order.statusCode === "DISPUTED" ? "danger" : "info"} title={t("disputes")} className="mb-6">
          <ul className="space-y-1">
            {order.disputes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/disputes/${d.id}`} className="font-medium hover:underline">
                  {d.disputeNumber}
                </Link>
                <span>{d.title}</span>
                <StatusBadge status={d.status} size="sm" />
              </li>
            ))}
          </ul>
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
                    <TH>{t("colDescription")}</TH>
                    <TH className="text-right">{t("quantity")}</TH>
                    <TH className="text-right">{t("unitPrice")}</TH>
                    <TH className="text-right">{t("lineTotal")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {order.items.map((i) => (
                    <TR key={i.id}>
                      <TD className="font-medium">{i.description}</TD>
                      <TD className="whitespace-nowrap text-right text-steel-600">
                        {formatNumber(i.quantity, locale)} {i.unit}
                      </TD>
                      <TD className="whitespace-nowrap text-right tabular-nums">{formatMoney(i.unitPrice, order.currency, locale, { maxFractionDigits: 4 })}</TD>
                      <TD className="whitespace-nowrap text-right font-medium tabular-nums">{formatMoney(i.total, order.currency, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <dl className="space-y-1 border-t border-steel-100 px-5 py-4 text-sm">
                <div className="flex justify-between"><dt className="text-steel-600">{t("subtotal")}</dt><dd className="tabular-nums">{formatMoney(order.subtotal, order.currency, locale)}</dd></div>
                {order.shippingCost > 0 ? <div className="flex justify-between"><dt className="text-steel-600">{t("shipping")}</dt><dd className="tabular-nums">{formatMoney(order.shippingCost, order.currency, locale)}</dd></div> : null}
                {order.taxAmount > 0 ? <div className="flex justify-between"><dt className="text-steel-600">{t("tax")}</dt><dd className="tabular-nums">{formatMoney(order.taxAmount, order.currency, locale)}</dd></div> : null}
                {order.discount > 0 ? <div className="flex justify-between"><dt className="text-steel-600">{t("discount")}</dt><dd className="tabular-nums">− {formatMoney(order.discount, order.currency, locale)}</dd></div> : null}
                {order.platformFee > 0 ? <div className="flex justify-between"><dt className="text-steel-600">{t("platformFee")}</dt><dd className="tabular-nums">{formatMoney(order.platformFee, order.currency, locale)}</dd></div> : null}
                <div className="flex justify-between border-t border-steel-100 pt-2"><dt className="font-semibold text-ink-900">{t("total")}</dt><dd className="font-display text-lg font-semibold tabular-nums">{formatMoney(order.total, order.currency, locale)}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("payments")} />
            <CardContent className="p-0">
              {order.payments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("payment")}</TH>
                      <TH className="text-right">{t("amount")}</TH>
                      <TH>{tc("status")}</TH>
                      <TH className="hidden md:table-cell">{t("escrow")}</TH>
                      <TH className="hidden md:table-cell">{t("provider")}</TH>
                      <TH className="text-right">{tc("actions")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {order.payments.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <span className="font-medium">{p.paymentNumber}</span>
                          <span className="block text-xs text-steel-500">
                            {p.milestoneLabel ?? humanize(p.kind)}
                            {p.dueAt ? ` · ${t("due")} ${formatDate(p.dueAt, locale)}` : ""}
                            {p.paidAt ? ` · ${t("paid")} ${formatDate(p.paidAt, locale)}` : ""}
                          </span>
                          {p.transactions.length ? <JsonDetails summary={t("transactions", { count: p.transactions.length })} value={p.transactions.map((x) => ({ type: x.type, status: x.status, amount: x.amount, currency: x.currency, providerTxnId: x.providerTxnId, note: x.note, at: x.createdAt }))} className="mt-1" /> : null}
                        </TD>
                        <TD className="whitespace-nowrap text-right tabular-nums">{formatMoney(p.amount, p.currency, locale)}</TD>
                        <TD>
                          <StatusBadge status={p.status} size="sm" />
                        </TD>
                        <TD className="hidden md:table-cell">
                          <StatusBadge status={p.escrowStatus} size="sm" />
                        </TD>
                        <TD className="hidden text-xs md:table-cell">{p.provider?.name ?? "—"}</TD>
                        <TD className="text-right">
                          <PaymentAdminButtons paymentId={p.id} status={p.status} escrowStatus={p.escrowStatus} amount={p.amount} currency={p.currency} canWrite={canPay} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              {order.invoices.length ? (
                <div className="border-t border-steel-100 px-5 py-3 text-xs text-steel-600">
                  {t("invoices")}: {order.invoices.map((i) => `${i.invoiceNumber} (${humanize(i.status)})`).join(", ")}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("shipments")} />
            <CardContent className="space-y-5">
              {order.shipments.length === 0 ? (
                <p className="text-sm text-steel-500">{tc("none")}</p>
              ) : (
                order.shipments.map((s) => (
                  <div key={s.id} className="rounded-md border border-hairline p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-ink-900">{s.shipmentNumber}</span>
                        <p className="text-xs text-steel-500">
                          {s.carrier ?? s.provider?.name ?? "—"} · {humanize(s.mode)}
                          {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                          {s.eta ? ` · ETA ${formatDate(s.eta, locale)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={s.status} label={statusLabels[s.status]} />
                    </div>
                    <ShipmentStepper status={s.status} mode={s.mode} events={s.events} locale={locale} labels={statusLabels} orientation="horizontal" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("timeline")} description={t("timelineHint")} />
            <CardContent className="p-0">
              <ul className="divide-y divide-steel-100">
                {order.events.map((e) => (
                  <li key={e.id} className="px-5 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge size="sm" variant="outline">
                        {e.type}
                      </Badge>
                      <span className="font-medium text-ink-900">{e.title}</span>
                      {!e.isVisibleToBuyer || !e.isVisibleToSupplier ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-warning-700">
                          <EyeOff className="size-3" /> {!e.isVisibleToBuyer && !e.isVisibleToSupplier ? t("hiddenFromBoth") : !e.isVisibleToBuyer ? t("hiddenFromBuyer") : t("hiddenFromSupplier")}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-steel-500">
                        {formatDateTime(e.createdAt, locale)}
                        {e.actor ? ` · ${e.actor.name}` : ""}
                      </span>
                    </div>
                    {e.description ? <p className="mt-0.5 text-xs text-steel-600">{e.description}</p> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("parties")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("colBuyer"), value: company(order.buyerCompany) },
                  { label: t("colSupplier"), value: company(order.supplierCompany) },
                  { label: t("rfq"), value: order.rfq ? <Link href={`/admin/rfqs/${order.rfq.id}`} className="hover:underline">{order.rfq.rfqNumber}</Link> : "—" },
                  { label: t("quotation"), value: order.quotation ? `${order.quotation.quotationNumber} (v${order.quotation.revisionNumber})` : "—" },
                ]}
              />
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
                  { label: t("shippingAddress"), value: order.shippingAddress ? [order.shippingAddress.company, order.shippingAddress.line1, order.shippingAddress.city, order.shippingAddress.countryCode].filter(Boolean).join(", ") : "—" },
                  ...(order.buyerNotes ? [{ label: t("buyerNotes"), value: order.buyerNotes }] : []),
                  ...(order.supplierNotes ? [{ label: t("supplierNotes"), value: order.supplierNotes }] : []),
                  ...(order.internalNotes ? [{ label: t("internalNotes"), value: order.internalNotes }] : []),
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("documents")} />
            <CardContent className="p-0">
              {order.documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {order.documents.map((d) => (
                    <li key={d.id} className="px-5 py-2.5 text-sm">
                      <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-ink-900 hover:underline">
                        {d.name}
                      </a>
                      <p className="text-xs text-steel-500">
                        {humanize(d.type)} · {d.visibility} · {formatDate(d.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("commissions")} />
            <CardContent className="p-0">
              {order.commissions.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {order.commissions.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span>
                        {humanize(c.type)}
                        <span className="block text-xs text-steel-500">{c.rate != null ? `${c.rate}%` : ""}</span>
                      </span>
                      <span className="text-right">
                        <span className="tabular-nums">{formatMoney(c.amount, c.currency, locale)}</span>
                        <StatusBadge status={c.status} size="sm" className="ml-2" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {order.inspections.length ? (
            <Card>
              <CardHeader title={t("inspections")} />
              <CardContent className="p-0">
                <ul className="divide-y divide-steel-100">
                  {order.inspections.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span>
                        {humanize(i.type)}
                        <span className="block text-xs text-steel-500">{i.provider?.name ?? "—"}</span>
                      </span>
                      <span className="flex gap-1">
                        <StatusBadge status={i.status} size="sm" />
                        {i.result !== "PENDING" ? <StatusBadge status={i.result} size="sm" /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
