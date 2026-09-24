import { FileText, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { ShipmentTimeline, STATUS_BADGE } from "@/components/logistics/shipment-timeline";
import { StatusUpdateDialog } from "@/components/logistics/status-update-dialog";
import { UpdateShipmentButton } from "@/components/seller/sales/shipment-actions";
import { Alert, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader } from "@/components/ui";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listActiveProviders, shipmentTimeline } from "@/modules/logistics/tracking/queries";
import { nextStatusesFor } from "@/modules/logistics/tracking/service";
import { SHIPMENT_STATUSES, statusTone } from "@/modules/logistics/tracking/statuses";
import { addShipmentEventAction } from "@/modules/seller/sales/shipments/actions";
import { getSellerShipment } from "@/modules/seller/sales/shipments/queries";

export const metadata: Metadata = { title: "Shipment", robots: { index: false } };

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function SellerShipmentDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company, user } = await requireCompany({ permission: "orders.read", seller: true });
  const t = await getTranslations("sales.shipments");
  const tm = await getTranslations("logistics.modes");
  const tt = await getTranslations("tracking");

  const s = await getSellerShipment(company.id, id);
  if (!s) notFound();

  const labels = Object.fromEntries(SHIPMENT_STATUSES.map((k) => [k, tt(`status.${k}`)]));
  const addr = (a: typeof s.destinationAddress) => (a ? [a.company, a.line1, `${a.postalCode ?? ""} ${a.city}`.trim(), a.countryCode].filter(Boolean).join(", ") : "—");
  const [timeline, providers, allowed] = await Promise.all([shipmentTimeline(s.id), listActiveProviders(), nextStatusesFor({ kind: "SELLER", userId: user.id, companyId: company.id }, s.id)]);
  const managedBy = s.provider && providers.find((p) => p.id === s.provider?.id)?.onPlatform ? s.provider.name : null;

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
            <Badge variant={STATUS_BADGE[statusTone(s.status)]}>{tt(`status.${s.status}`)}</Badge>
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
              providers={providers}
              values={{
                mode: s.mode,
                providerId: s.provider?.id ?? null,
                carrierCode: s.carrierCode,
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
            <StatusUpdateDialog action={addShipmentEventAction} shipmentId={s.id} allowed={allowed} />
          </>
        }
      />

      {managedBy ? (
        <Alert variant="info" title={tt("partner.label")} className="mb-5">
          {tt("partner.managedNote", { name: managedBy })}
        </Alert>
      ) : null}
      {s.exceptionReason ? (
        <Alert variant="warning" title={tt(`status.${s.status}`)} className="mb-5">
          {tt(`reasons.${s.exceptionReason}`)}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("milestones")} description={t("milestonesHint")} />
            <CardContent>
              <ShipmentStepper status={s.status} mode={s.mode} events={s.events} locale={locale} labels={labels} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("events")} action={<MapPin className="size-4 text-steel-400" />} />
            <CardContent>
              <ShipmentTimeline events={timeline} locale={locale} />
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
                  { label: tt("partner.label"), value: s.provider?.name ?? tt("partner.none") },
                  { label: t("carrier"), value: s.carrier ?? "—" },
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
