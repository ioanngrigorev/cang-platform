import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SellerCreditScoreCard } from "@/components/seller/sales/credit-score-card";
import { ApplyFinancingButton } from "@/components/seller/sales/financing-actions";
import { Badge, Card, CardContent, CardHeader, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { latestCreditScore, listCompanyFinancing } from "@/modules/financing/queries";
import { sellerOrderOptions } from "@/modules/orders/queries";
import { sellerFinancingPartners } from "@/modules/seller/sales/financing/queries";
import { FINANCEABLE_ORDER_STATUSES } from "@/modules/seller/sales/financing/schemas";

export const metadata: Metadata = { title: "Financing", robots: { index: false } };

export default async function SellerFinancingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; order?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "financing.apply", seller: true });
  const t = await getTranslations("sales.financing");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, score, partners, orders] = await Promise.all([
    listCompanyFinancing(company.id, { page }),
    latestCreditScore(company.id),
    sellerFinancingPartners(company.countryCode),
    sellerOrderOptions(company.id, FINANCEABLE_ORDER_STATUSES),
  ]);
  const orderOptions = orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, total: o.total, currency: o.currency, buyerName: o.buyerName }));
  const productLabel = (p: string) => (t.has(`products.${p}`) ? t(`products.${p}`) : humanize(p));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<ApplyFinancingButton orders={orderOptions} defaultOrderId={sp.order} locale={locale} />} />

      <div className="mb-6">
        <SellerCreditScoreCard locale={locale} snapshot={score ? { score: score.score, grade: score.grade, computedAt: score.computedAt.toISOString(), features: score.features, breakdown: score.breakdown } : null} />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Landmark />} title={t("empty")} description={t("emptyDescription")} action={<ApplyFinancingButton orders={orderOptions} defaultOrderId={sp.order} locale={locale} />} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colApplication")}</TH>
                <TH>{t("colProduct")}</TH>
                <TH>{t("colAmount")}</TH>
                <TH className="hidden md:table-cell">{t("colProvider")}</TH>
                <TH className="hidden lg:table-cell">{t("colOffers")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden sm:table-cell">{t("colCreated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => {
                const best = a.offers.find((o) => o.status === "ACCEPTED") ?? a.offers.find((o) => o.status === "OFFERED");
                return (
                  <TR key={a.id}>
                    <TD>
                      <Link href={`/seller/financing/${a.id}`} className="font-medium text-ink-900 hover:underline">
                        {a.applicationNumber}
                      </Link>
                      {a.order ? <p className="text-xs text-steel-500">{a.order.orderNumber}</p> : null}
                    </TD>
                    <TD className="text-steel-600">{productLabel(a.productType)}</TD>
                    <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(a.amount, a.currency, locale)}</TD>
                    <TD className="hidden text-steel-600 md:table-cell">{a.provider?.name ?? <span className="text-steel-400">{t("notRouted")}</span>}</TD>
                    <TD className="hidden text-xs text-steel-600 lg:table-cell">
                      {best ? `${formatMoney(best.amount, best.currency, locale)} · ${t("days", { n: best.tenorDays })}${best.interestRate != null ? ` · ${best.interestRate}${t("perYear")}` : ""}` : "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(a.submittedAt ?? a.createdAt, locale)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/financing?page=${p}`} className="mt-6" />
        </>
      )}

      {partners.length ? (
        <Card className="mt-6">
          <CardHeader title={t("partners")} description={t("partnersHint")} />
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {partners.map((p) => (
              <div key={p.id} className="rounded-lg border border-hairline p-4">
                <p className="font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-steel-500">
                  {humanize(p.type)}
                  {p.regulator ? ` · ${p.regulator}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.products.map((pr) => (
                    <Badge key={pr} variant="outline" size="sm">
                      {productLabel(pr)}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("indicativeRate")}</dt>
                    <dd className="text-ink-900">{p.indicativeRate ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("amountRange")}</dt>
                    <dd className="tabular-nums text-ink-900">
                      {p.minAmount ? formatMoney(p.minAmount, p.currencies[0] ?? "USD", locale, { compact: true }) : "—"} – {p.maxAmount ? formatMoney(p.maxAmount, p.currencies[0] ?? "USD", locale, { compact: true }) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("tenorRange")}</dt>
                    <dd className="text-ink-900">
                      {p.minTenorDays ?? "—"}–{p.maxTenorDays ?? "—"} d
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6 border-info-100 bg-info-50/40">
        <CardContent className="py-3 text-xs text-info-700">{t("disclaimer")}</CardContent>
      </Card>
    </>
  );
}
