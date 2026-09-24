import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ShipmentTimeline, STATUS_BADGE } from "@/components/logistics/shipment-timeline";
import { StatusUpdateDialog } from "@/components/logistics/status-update-dialog";
import { SyncTrackingButton, TrackingDialog } from "@/components/logistics/tracking-dialog";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader } from "@/components/ui";
import type { Address } from "@/db/schema/orders";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { carrierByCode } from "@/modules/logistics/tracking/carriers";
import { nextStatusesFor } from "@/modules/logistics/tracking/service";
import { SHIPMENT_STATUSES, flowFor, statusTone } from "@/modules/logistics/tracking/statuses";
import { partnerSetTrackingAction, partnerSyncTrackingAction, partnerUpdateStatusAction } from "@/modules/partner/actions";
import { requirePartner } from "@/modules/partner/context";
import { getPartnerShipment } from "@/modules/partner/queries";

export const metadata: Metadata = { title: "Shipment", robots: { index: false } };

function addressLines(a: Address | null | undefined): string[] {
  if (!a) return [];
  return [a.company, a.contactName, a.phone, [a.line1, a.line2].filter(Boolean).join(", "), [a.city, a.state, a.postalCode].filter(Boolean).join(", "), a.countryCode].filter((x): x is string => !!x);
}

export default async function PartnerShipmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { user, company, provider, membership } = await requirePartner();
  const data = await getPartnerShipment(provider.id, id);
  if (!data) notFound();
  const t = await getTranslations("partner");
  const tt = await getTranslations("tracking");
  const tm = await getTranslations("logistics.modes");
  const s = data.shipment;
  const canUpdate = provider.isActive && ["OWNER", "ADMIN", "MANAGER", "STAFF", "PURCHASING"].includes(membership.role);
  const allowed = canUpdate ? await nextStatusesFor({ kind: "PARTNER", userId: user.id, companyId: company.id, via: "portal" }, s.id) : [];
  const flow = flowFor(s.mode);
  const labels = Object.fromEntries(SHIPMENT_STATUSES.map((k) => [k, tt(`status.${k}`)]));
  const carrier = carrierByCode(s.carrierCode);
  const destination = s.destinationAddress ?? data.order.shippingAddress;
  const pickupLines = [data.supplier.name, data.supplier.address, [data.supplier.city, data.supplierProvince ? (locale === "vi" ? data.supplierProvince.nameVi : data.supplierProvince.name) : null].filter(Boolean).join(", "), data.supplier.countryCode, data.supplier.phone, data.supplier.email].filter((x): x is string => !!x);
  const toDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("list.title"), href: "/partner/shipments" }, { label: s.shipmentNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{s.shipmentNumber}</span>
            <Badge variant={STATUS_BADGE[statusTone(s.status)]}>{tt(`status.${s.status}`)}</Badge>
          </span>
        }
        description={`${t("detail.order", { number: data.order.orderNumber })} · ${tm(s.mode)} · ${tt(`flows.${flow}`)}`}
        actions={
          canUpdate ? (
            <div className="flex flex-wrap gap-2">
              <StatusUpdateDialog action={partnerUpdateStatusAction} shipmentId={s.id} allowed={allowed} />
              <TrackingDialog action={partnerSetTrackingAction} shipmentId={s.id} freight={flow === "FREIGHT"} values={{ carrierCode: s.carrierCode, carrier: s.carrier, trackingNumber: s.trackingNumber, vesselOrFlight: s.vesselOrFlight, containerNumber: s.containerNumber, etd: toDate(s.etd), eta: toDate(s.eta) }} />
              {carrier?.auto && s.trackingNumber ? <SyncTrackingButton action={partnerSyncTrackingAction} shipmentId={s.id} /> : null}
            </div>
          ) : undefined
        }
      />

      {!provider.isActive ? (
        <Alert variant="warning" title={t("overview.pendingTitle")} className="mb-5">
          {t("overview.pendingBody")}
        </Alert>
      ) : null}
      {s.exceptionReason ? (
        <Alert variant="warning" title={tt(`status.${s.status}`)} className="mb-5">
          {tt(`reasons.${s.exceptionReason}`)}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardContent className="pt-5">
          <ShipmentStepper status={s.status} mode={s.mode} events={data.events.map((e) => ({ ...e, milestone: e.milestone }))} locale={locale} labels={labels} orientation="horizontal" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={t("detail.pickup")} description={s.etd ? t("detail.pickupBy", { date: formatDate(s.etd, locale) }) : undefined} />
              <CardContent className="space-y-0.5 text-sm text-ink-900">
                {pickupLines.map((l, i) => (
                  <p key={i} className={i === 0 ? "font-medium" : "text-steel-600"}>{l}</p>
                ))}
                {s.originPort ? <p className="pt-2 text-xs text-steel-500">{t("detail.originPort", { port: s.originPort })}</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={t("detail.delivery")} description={s.eta ? t("detail.eta", { date: formatDate(s.eta, locale) }) : undefined} />
              <CardContent className="space-y-0.5 text-sm text-ink-900">
                <p className="font-medium">{data.buyer.name}</p>
                {addressLines(destination).map((l, i) => (
                  <p key={i} className="text-steel-600">{l}</p>
                ))}
                {s.destinationPort ? <p className="pt-2 text-xs text-steel-500">{t("detail.destinationPort", { port: s.destinationPort })}</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title={t("detail.cargo")} description={data.order.incoterm ? t("detail.incoterm", { incoterm: data.order.incoterm }) : undefined} />
            <CardContent>
              <ul className="mb-4 space-y-1 text-sm">
                {data.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink-900">{it.description}{it.hsCode ? <span className="ml-1 text-xs text-steel-500">HS {it.hsCode}</span> : null}</span>
                    <span className="shrink-0 text-steel-600">{formatNumber(it.quantity, locale)} {it.unit}</span>
                  </li>
                ))}
              </ul>
              <DataList
                columns={3}
                items={[
                  { label: t("detail.packages"), value: s.packages != null ? formatNumber(s.packages, locale) : "—" },
                  { label: t("detail.weight"), value: s.grossWeightKg != null ? `${formatNumber(s.grossWeightKg, locale)} kg` : "—" },
                  { label: t("detail.volume"), value: s.volumeCbm != null ? `${formatNumber(s.volumeCbm, locale)} m³` : "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={tt("timeline.title")} />
            <CardContent>
              <ShipmentTimeline events={data.events} locale={locale} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("detail.transport")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: tt("trackingForm.carrier"), value: s.carrier ?? carrier?.name ?? "—" },
                  {
                    label: tt("trackingForm.trackingNumber"),
                    value: s.trackingNumber ? (
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        {s.trackingNumber}
                        {carrier?.trackUrl ? (
                          <a href={carrier.trackUrl(s.trackingNumber)} target="_blank" rel="noreferrer" className="text-steel-500 hover:text-ink-900" aria-label={tt("trackingForm.trackOnCarrier")}>
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: tt("trackingForm.auto"), value: carrier?.auto ? tt("trackingForm.auto") : tt("trackingForm.manual") },
                  ...(s.vesselOrFlight ? [{ label: tt("trackingForm.vessel"), value: s.vesselOrFlight }] : []),
                  ...(s.containerNumber ? [{ label: tt("trackingForm.container"), value: <span className="font-mono">{s.containerNumber}</span> }] : []),
                  { label: tt("trackingForm.etd"), value: s.etd ? formatDate(s.etd, locale) : "—" },
                  { label: tt("trackingForm.eta"), value: s.eta ? formatDate(s.eta, locale) : "—" },
                ]}
              />
              {s.trackingSyncedAt ? (
                <p className="mt-3 text-xs text-steel-500">
                  {s.trackingSyncError ? tt("trackingForm.syncError", { error: s.trackingSyncError }) : tt("trackingForm.synced", { time: formatDateTime(s.trackingSyncedAt, locale) })}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("detail.contacts")} />
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-steel-500">{t("detail.shipper")}</p>
                <p className="font-medium text-ink-900">{data.supplier.name}</p>
                <p className="text-steel-600">{[data.supplier.phone, data.supplier.email].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-steel-500">{t("detail.consignee")}</p>
                <p className="font-medium text-ink-900">{data.buyer.name}</p>
                <p className="text-steel-600">{[data.buyer.phone, data.buyer.email].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            </CardContent>
          </Card>
          {s.receiverName || s.podUrl ? (
            <Card>
              <CardHeader title={tt("timeline.pod")} />
              <CardContent className="text-sm">
                {s.receiverName ? <p>{tt("timeline.receiver", { name: s.receiverName })}</p> : null}
                {s.podUrl ? (
                  <a href={s.podUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-ink-900 underline">
                    {tt("timeline.pod")} <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
