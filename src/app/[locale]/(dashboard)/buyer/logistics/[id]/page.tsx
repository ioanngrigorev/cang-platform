import { Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CancelLogisticsRequest, LogisticsQuotes } from "@/components/buyer/logistics-quotes";
import { Badge, Button, Card, CardContent, CardHeader, DataList, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerLogisticsRequest } from "@/modules/logistics/queries";

export const metadata: Metadata = { title: "Freight request", robots: { index: false } };

export default async function BuyerLogisticsDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "logistics.manage", buyer: true });
  const t = await getTranslations("logistics.detail");
  const tf = await getTranslations("logistics.form");
  const ts = await getTranslations("logistics.services");
  const tm = await getTranslations("logistics.modes");

  const r = await getBuyerLogisticsRequest(company.id, id);
  if (!r) notFound();

  const addr = (a: typeof r.originAddress) => (a ? [a.company, a.line1, `${a.postalCode ?? ""} ${a.city}`.trim(), a.countryCode].filter(Boolean).join(", ") : "—");

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("back"), href: "/buyer/logistics" },
          { label: r.requestNumber },
        ]}
        title={t("title", { number: r.requestNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span>
              {r.originCountryCode} → {r.destinationCountryCode}
            </span>
            {r.preferredMode ? <span>· {tm(r.preferredMode)}</span> : null}
          </span>
        }
        actions={
          <>
            {r.order ? (
              <Button href={`/buyer/orders/${r.order.id}`} variant="secondary">
                {r.order.orderNumber}
              </Button>
            ) : null}
            {r.status !== "BOOKED" && r.status !== "CANCELLED" ? <CancelLogisticsRequest requestId={r.id} /> : null}
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader title={t("quotes")} description={t("quotesHint")} />
        <CardContent>
          {r.quotes.length === 0 ? (
            <EmptyState icon={<Truck />} title={t("noQuotes")} description={t("noQuotesHint")} />
          ) : (
            <LogisticsQuotes
              requestId={r.id}
              requestStatus={r.status}
              locale={locale}
              orderId={r.orderId}
              quotes={r.quotes.map((q) => ({
                id: q.id,
                status: q.status,
                currency: q.currency,
                amount: q.amount,
                transitDays: q.transitDays,
                mode: q.mode,
                validUntil: q.validUntil ? q.validUntil.toISOString() : null,
                notes: q.notes,
                breakdown: q.breakdown,
                provider: q.provider ? { id: q.provider.id, name: q.provider.name, logoUrl: q.provider.logoUrl } : null,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title={t("route")} />
          <CardContent>
            <DataList
              columns={1}
              items={[
                { label: tf("origin"), value: addr(r.originAddress) },
                { label: tf("destination"), value: addr(r.destinationAddress) },
                { label: tf("incoterm"), value: r.incoterm ?? "—" },
                { label: tf("readyDate"), value: r.readyDate ? formatDate(r.readyDate, locale) : "—" },
                { label: tf("requiredDelivery"), value: r.requiredDeliveryDate ? formatDate(r.requiredDeliveryDate, locale) : "—" },
                { label: tf("quoteDeadline"), value: r.quoteDeadline ? formatDate(r.quoteDeadline, locale) : "—" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("cargo")} />
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("services")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {r.services.map((s) => (
                  <Badge key={s} variant="outline">
                    {ts(s)}
                  </Badge>
                ))}
              </div>
            </div>
            <DataList
              columns={2}
              items={[
                { label: tf("cargoDescription"), value: r.cargoDescription ?? "—" },
                { label: tf("hsCode"), value: r.hsCode ?? "—" },
                { label: tf("packages"), value: r.packages ? formatNumber(r.packages, locale) : "—" },
                { label: tf("weight"), value: r.grossWeightKg ? `${formatNumber(r.grossWeightKg, locale)} kg` : "—" },
                { label: tf("volume"), value: r.volumeCbm ? `${formatNumber(r.volumeCbm, locale)} CBM` : "—" },
                { label: tf("containerType"), value: r.containerType ?? "—" },
                { label: tf("cargoValue"), value: r.cargoValue ? formatMoney(r.cargoValue, r.currency, locale) : "—" },
                { label: tf("insurance"), value: r.insuranceRequired ? t("insuranceYes") : t("insuranceNo") },
              ]}
            />
            {r.notes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("notes")}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{r.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
