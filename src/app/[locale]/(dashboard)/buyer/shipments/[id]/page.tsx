import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShipmentTimeline } from "@/components/logistics/shipment-timeline";
import { ShipmentStepper } from "@/components/orders/shipment-tracker";
import { shipmentStatusLabels } from "@/modules/logistics/tracking/labels";
import { Alert, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, formatNumber, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerShipment } from "@/modules/logistics/queries";
import { carrierByCode } from "@/modules/logistics/tracking/carriers";
import { shipmentTimeline } from "@/modules/logistics/tracking/queries";

export const metadata: Metadata = { title: "Shipment", robots: { index: false } };

export default async function BuyerShipmentDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("orders.shipments");
  const statusLabels = await shipmentStatusLabels();
  const tt = await getTranslations("tracking");
  const tm = await getTranslations("logistics.modes");

  const s = await getBuyerShipment(company.id, id);
  if (!s) notFound();
  const timeline = await shipmentTimeline(s.id);
  const carrier = carrierByCode(s.carrierCode);

  const addr = (a: typeof s.originAddress) => (a ? [a.company, a.line1, `${a.postalCode ?? ""} ${a.city}`.trim(), a.countryCode].filter(Boolean).join(", ") : "—");

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: "/buyer/shipments" },
          { label: s.shipmentNumber },
        ]}
        title={t("detailTitle", { number: s.shipmentNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} label={statusLabels[s.status]} />
            <span>{tm(s.mode)}</span>
            {s.carrier ? <span>· {s.carrier}</span> : null}
          </span>
        }
        actions={
          s.order ? (
            <Button href={`/buyer/orders/${s.order.id}`} variant="secondary">
              {s.order.orderNumber}
            </Button>
          ) : undefined
        }
      />

      {s.exceptionReason ? (
        <Alert variant="warning" title={statusLabels[s.status]} className="mb-5">
          {tt(`reasons.${s.exceptionReason}`)}
        </Alert>
      ) : null}
      {s.status === "DELIVERED" && s.order?.statusCode === "DELIVERY" ? (
        <Alert variant="success" title={statusLabels.DELIVERED} className="mb-5">
          {t("confirmReceiptHint")}{" "}
          <Button href={`/buyer/orders/${s.order.id}`} variant="secondary" size="sm" className="ml-1">
            {s.order.orderNumber}
          </Button>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("milestones")} />
            <CardContent>
              <ShipmentStepper status={s.status} mode={s.mode} events={s.events} locale={locale} labels={statusLabels} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={tt("timeline.title")} />
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
                  { label: t("origin"), value: addr(s.originAddress) },
                  { label: t("originPort"), value: s.originPort ?? "—" },
                  { label: t("destination"), value: addr(s.destinationAddress) },
                  { label: t("destinationPort"), value: s.destinationPort ?? "—" },
                  { label: t("etd"), value: s.etd ? formatDate(s.etd, locale) : "—" },
                  { label: t("eta"), value: s.eta ? formatDate(s.eta, locale) : "—" },
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
                  { label: tt("partner.label"), value: s.provider?.name ?? "—" },
                  { label: t("carrier"), value: s.carrier ?? "—" },
                  {
                    label: t("tracking"),
                    value: s.trackingNumber ? (
                      carrier?.trackUrl ? (
                        <a href={carrier.trackUrl(s.trackingNumber)} target="_blank" rel="noreferrer" className="font-mono underline">
                          {s.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-mono">{s.trackingNumber}</span>
                      )
                    ) : (
                      "—"
                    ),
                  },
                  ...(s.receiverName ? [{ label: tt("timeline.pod"), value: s.podUrl ? <a href={s.podUrl} target="_blank" rel="noreferrer" className="underline">{s.receiverName}</a> : s.receiverName }] : []),
                  { label: t("vessel"), value: s.vesselOrFlight ?? "—" },
                  { label: t("container"), value: s.containerNumber ?? "—" },
                  { label: t("packages"), value: s.packages ? formatNumber(s.packages, locale) : "—" },
                  { label: t("weight"), value: s.grossWeightKg ? `${formatNumber(s.grossWeightKg, locale)} kg` : "—" },
                  { label: t("volume"), value: s.volumeCbm ? `${formatNumber(s.volumeCbm, locale)} CBM` : "—" },
                  { label: t("insured"), value: s.insured ? (s.insuranceValue ? formatMoney(s.insuranceValue, s.currency, locale) : "✓") : "—" },
                  { label: t("cost"), value: s.cost ? formatMoney(s.cost, s.currency, locale) : "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("documents")} />
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
