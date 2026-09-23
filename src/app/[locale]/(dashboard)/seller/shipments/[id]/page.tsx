import { FileText, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { AddShipmentEventButton, UpdateShipmentButton } from "@/components/seller/sales/shipment-actions";
import { Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSellerShipment } from "@/modules/seller/sales/shipments/queries";

export const metadata: Metadata = { title: "Shipment", robots: { index: false } };

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function SellerShipmentDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "orders.read", seller: true });
  const t = await getTranslations("sales.shipments");
  const ts = await getTranslations("orders.shipments");
  const tm = await getTranslations("logistics.modes");
  const ta = await getTranslations("sales.shipmentActions");

  const s = await getSellerShipment(company.id, id);
  if (!s) notFound();

  const labels = Object.fromEntries(["FACTORY", "PICKUP", "WAREHOUSE", "ORIGIN_PORT", "DEPARTED", "IN_TRANSIT", "DESTINATION_PORT", "CUSTOMS", "LAST_MILE", "DELIVERED"].map((m) => [m, ts(`milestoneLabels.${m}`)]));
  const addr = (a: typeof s.destinationAddress) => (a ? [a.company, a.line1, `${a.postalCode ?? ""} ${a.city}`.trim(), a.countryCode].filter(Boolean).join(", ") : "—");
  const events = [...s.events].reverse();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: "/seller/shipments" },
          { label: s.shipmentNumber },
        ]}
        eyebrow={s.order.orderNumber}
        title={t("detailTitle", { number: s.shipmentNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            <span>{tm(s.mode)}</span>
            {s.carrier ? <span>· {s.carrier}</span> : null}
            {s.trackingNumber ? <span>· {s.trackingNumber}</span> : null}
          </span>
        }
        actions={
          <>
            <Button href={`/seller/orders/${s.order.id}`} variant="ghost">
              {s.order.orderNumber}
            </Button>
            <UpdateShipmentButton
              shipmentId={s.id}
              values={{
                mode: s.mode,
                carrier: s.carrier,
                trackingNumber: s.trackingNumber,
                vesselOrFlight: s.vesselOrFlight,
                containerNumber: s.containerNumber,
                originPort: s.originPort,
                destinationPort: s.destinationPort,
                packages: s.packages,
                grossWeightKg: s.grossWeightKg,
                volumeCbm: s.volumeCbm,
                etd: toDateInput(s.etd),
                eta: toDateInput(s.eta),
                notes: s.notes,
              }}
            />
            <AddShipmentEventButton shipmentId={s.id} currentStatus={s.status} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("milestones")} description={t("milestonesHint")} />
            <CardContent>
              <ShipmentStepper status={s.status} events={s.events} locale={locale} labels={labels} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("events")} action={<MapPin className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {events.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noEvents")}</p>
              ) : (
                <ol className="divide-y divide-steel-100">
                  {events.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{ta.has(`statuses.${e.status}`) ? ta(`statuses.${e.status}`) : humanize(e.status)}</p>
                        <p className="text-xs text-steel-500">
                          {[e.location, e.description].filter(Boolean).join(" · ") || (labels[e.milestone] ?? humanize(e.milestone))}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-steel-500">
                        <p>{formatDateTime(e.occurredAt, locale)}</p>
                        <p>{e.source === "manual" ? t("sourceManual") : t("sourceProvider")}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("route")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("buyer"), value: s.order.buyerCompany?.name ?? "—" },
                  { label: t("origin"), value: addr(s.originAddress) },
                  { label: t("originPort"), value: s.originPort ?? "—" },
                  { label: t("destinationPort"), value: s.destinationPort ?? "—" },
                  { label: t("destination"), value: addr(s.destinationAddress) },
                  { label: t("incoterm"), value: s.incoterm ?? s.order.incoterm ?? "—" },
                  { label: t("etd"), value: s.etd ? formatDate(s.etd, locale) : "—" },
                  { label: t("eta"), value: s.eta ? formatDate(s.eta, locale) : "—" },
                  { label: t("actualDeparture"), value: s.actualDeparture ? formatDate(s.actualDeparture, locale) : "—" },
                  { label: t("delivered"), value: s.deliveredAt ? formatDate(s.deliveredAt, locale) : "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("carrier")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("carrier"), value: s.carrier ?? s.provider?.name ?? "—" },
                  { label: t("tracking"), value: s.trackingNumber ?? "—" },
                  { label: t("vessel"), value: s.vesselOrFlight ?? "—" },
                  { label: t("container"), value: s.containerNumber ?? "—" },
                  { label: t("packages"), value: s.packages ? formatNumber(s.packages, locale) : "—" },
                  { label: t("weight"), value: s.grossWeightKg ? `${formatNumber(s.grossWeightKg, locale)} kg` : "—" },
                  { label: t("volume"), value: s.volumeCbm ? `${formatNumber(s.volumeCbm, locale)} CBM` : "—" },
                  { label: t("insured"), value: s.insured ? (s.insuranceValue ? formatMoney(s.insuranceValue, s.currency, locale) : "✓") : "—" },
                  { label: t("cost"), value: s.cost ? formatMoney(s.cost, s.currency, locale) : "—" },
                ]}
              />
              {s.notes ? <p className="mt-4 whitespace-pre-line border-t border-hairline pt-4 text-sm text-steel-600">{s.notes}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("documents")} action={<FileText className="size-4 text-steel-400" />} />
            <CardContent className="p-0">
              {s.documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noDocuments")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {s.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                      <FileText className="size-4 shrink-0 text-steel-400" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="truncate font-medium text-ink-900 hover:underline">
                        {d.name}
                      </a>
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
