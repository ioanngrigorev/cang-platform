import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AcceptSellerOfferButton, WithdrawSellerApplicationButton } from "@/components/seller/sales/financing-actions";
import { Alert, Badge, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getCompanyFinancingApplication } from "@/modules/financing/queries";

export const metadata: Metadata = { title: "Financing application", robots: { index: false } };

const WITHDRAWABLE = ["DRAFT", "SUBMITTED", "ROUTED", "UNDER_REVIEW", "OFFERED"];

export default async function SellerFinancingDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "financing.apply", seller: true });
  const t = await getTranslations("sales.financing");

  const app = await getCompanyFinancingApplication(company.id, id);
  if (!app) notFound();
  const productLabel = (p: string) => (t.has(`products.${p}`) ? t(`products.${p}`) : humanize(p));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: "/seller/financing" },
          { label: app.applicationNumber },
        ]}
        title={t("detailTitle", { number: app.applicationNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            <span>{productLabel(app.productType)}</span>
            <span className="font-medium text-ink-900">{formatMoney(app.amount, app.currency, locale)}</span>
          </span>
        }
        actions={WITHDRAWABLE.includes(app.status) ? <WithdrawSellerApplicationButton applicationId={app.id} /> : undefined}
      />

      {!app.providerId ? (
        <Alert variant="warning" title={t("notRoutedTitle")} className="mb-6">
          {app.notes ?? t("notRoutedHint")}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("offers")} />
            <CardContent className="space-y-4">
              {app.offers.length === 0 ? (
                <p className="text-sm text-steel-500">{t("noOffers")}</p>
              ) : (
                app.offers.map((o) => (
                  <div key={o.id} className={o.status === "ACCEPTED" ? "rounded-lg border border-success-200 bg-success-50/40 p-4" : "rounded-lg border border-hairline p-4"}>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink-900">{o.provider?.name ?? app.provider?.name ?? "—"}</p>
                        <p className="text-xs text-steel-500">{o.validUntil ? t("offerValid", { date: formatDate(o.validUntil, locale) }) : ""}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <DataList
                      columns={4}
                      items={[
                        { label: t("offerAmount"), value: formatMoney(o.amount, o.currency, locale) },
                        { label: t("offerRate"), value: o.interestRate != null ? `${o.interestRate}${t("perYear")}` : "—" },
                        { label: t("offerFee"), value: o.feeAmount != null ? formatMoney(o.feeAmount, o.currency, locale) : o.feePercent != null ? `${o.feePercent}%` : "—" },
                        { label: t("offerTenor"), value: t("days", { n: o.tenorDays }) },
                      ]}
                    />
                    {o.repaymentSchedule?.length ? (
                      <div className="mt-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("repayment")}</p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {o.repaymentSchedule.map((r, i) => (
                            <li key={i} className="flex justify-between">
                              <span className="text-steel-600">{formatDate(r.dueAt, locale)}</span>
                              <span className="tabular-nums text-ink-900">{formatMoney(r.amount, o.currency, locale)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {o.terms ? <p className="mt-3 text-xs text-steel-500">{o.terms}</p> : null}
                    {o.status === "OFFERED" ? (
                      <div className="mt-3">
                        <AcceptSellerOfferButton applicationId={app.id} offerId={o.id} amount={o.amount} currency={o.currency} locale={locale} />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("summary")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("productType"), value: productLabel(app.productType) },
                  { label: t("amount"), value: formatMoney(app.amount, app.currency, locale) },
                  { label: t("tenor"), value: app.requestedTenorDays ? t("days", { n: app.requestedTenorDays }) : "—" },
                  { label: t("purpose"), value: app.purpose ?? "—" },
                  {
                    label: t("order"),
                    value: app.order ? (
                      <Link href={`/seller/orders/${app.order.id}`} className="font-medium text-ink-900 hover:underline">
                        {app.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: t("submitted"), value: app.submittedAt ? formatDate(app.submittedAt, locale) : "—" },
                  { label: t("routed"), value: app.routedAt ? formatDate(app.routedAt, locale) : "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("partner")} action={<Landmark className="size-4 text-steel-400" />} />
            <CardContent className="space-y-2">
              {app.provider ? (
                <>
                  <p className="font-semibold text-ink-900">{app.provider.name}</p>
                  <p className="text-xs text-steel-500">
                    {humanize(app.provider.type)}
                    {app.provider.regulator ? ` · ${app.provider.regulator}` : ""}
                    {app.provider.licenseNumber ? ` · ${app.provider.licenseNumber}` : ""}
                  </p>
                  {app.provider.indicativeRate ? <Badge variant="outline">{app.provider.indicativeRate}</Badge> : null}
                </>
              ) : (
                <p className="text-sm text-steel-500">{t("notRouted")}</p>
              )}
              {app.riskScore != null ? (
                <p className="pt-2 text-xs text-steel-500">
                  {t("riskShared")}: {app.riskScore}/100 · {app.riskGrade} · {app.riskScoreVersion}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-info-100 bg-info-50/40">
            <CardContent className="py-3 text-xs text-info-700">{t("disclaimer")}</CardContent>
          </Card>

          <Button href="/seller/financing" variant="secondary" className="w-full">
            {t("backToList")}
          </Button>
        </div>
      </div>
    </>
  );
}
