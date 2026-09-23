import { BarChart3, Eye, FileText, Package, Receipt, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BarChart, HBar } from "@/components/seller/bar-chart";
import { Card, CardContent, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { sellerDailyMetrics, sellerFunnel, sumMetrics, topSellerProducts } from "@/modules/seller/analytics";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function SellerAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "analytics.read", seller: true });
  const t = await getTranslations("seller.analytics");

  const [days, products, funnel] = await Promise.all([sellerDailyMetrics(company.id, 30), topSellerProducts(company.id, 10), sellerFunnel(company.id)]);
  const totals = sumMetrics(days);
  const hasData = days.some((d) => d.views || d.productViews || d.leads || d.orders);
  const dayLabel = (iso: string) => formatDate(iso, locale, { day: "numeric", month: "short" });
  const maxProductViews = Math.max(1, ...products.map((p) => p.viewCount));
  const conversion = (a: number, b: number) => (a > 0 ? `${Math.round((b / a) * 100)}%` : "—");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
        <StatCard label={t("stats.profileViews")} value={formatNumber(totals.views, locale)} icon={<Users />} />
        <StatCard label={t("stats.productViews")} value={formatNumber(totals.productViews, locale)} icon={<Eye />} />
        <StatCard label={t("stats.rfqs")} value={formatNumber(totals.rfqsReceived, locale)} hint={t("stats.leadsHint", { count: totals.leads })} icon={<FileText />} />
        <StatCard label={t("stats.quotations")} value={formatNumber(totals.quotations, locale)} icon={<Receipt />} />
        <StatCard label={t("stats.orders")} value={formatNumber(totals.orders, locale)} icon={<Package />} />
        <StatCard label={t("stats.revenue")} value={formatMoney(totals.gmvUsd, "USD", locale, { compact: totals.gmvUsd > 100000 })} icon={<TrendingUp />} />
      </div>

      {!hasData ? (
        <EmptyState icon={<BarChart3 />} title={t("empty")} description={t("emptyHint")} className="mt-6" />
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <Card>
            <CardHeader title={t("charts.productViews")} description={t("charts.last30")} />
            <CardContent>
              <BarChart points={days.map((d) => ({ label: dayLabel(d.date), value: d.productViews, title: `${formatDate(d.date, locale)} · ${formatNumber(d.productViews, locale)}` }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("charts.profileViews")} description={t("charts.last30")} />
            <CardContent>
              <BarChart points={days.map((d) => ({ label: dayLabel(d.date), value: d.views, title: `${formatDate(d.date, locale)} · ${formatNumber(d.views, locale)}` }))} accent="bg-brand-300" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("charts.leads")} description={t("charts.leadsHint")} />
            <CardContent>
              <BarChart points={days.map((d) => ({ label: dayLabel(d.date), value: d.leads + d.rfqsReceived, title: `${formatDate(d.date, locale)} · ${formatNumber(d.leads + d.rfqsReceived, locale)}` }))} height={120} accent="bg-ink-700" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("charts.gmv")} description={t("charts.gmvHint")} />
            <CardContent>
              <BarChart points={days.map((d) => ({ label: dayLabel(d.date), value: d.gmvUsd, title: `${formatDate(d.date, locale)} · ${formatMoney(d.gmvUsd, "USD", locale)}` }))} height={120} formatValue={(v) => formatMoney(v, "USD", locale)} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title={t("topProducts")} description={t("topProductsHint")} />
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-steel-500">{t("noProducts")}</p>
            ) : (
              products.map((p, i) => (
                <HBar
                  key={p.id}
                  value={p.viewCount}
                  max={maxProductViews}
                  label={
                    <span className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-xs tabular-nums text-steel-400">{i + 1}.</span>
                      <Link href={`/seller/products/${p.id}`} className="truncate hover:underline">
                        {localized(p, "title", locale)}
                      </Link>
                      {p.status !== "ACTIVE" ? <StatusBadge status={p.status} size="sm" /> : null}
                    </span>
                  }
                  meta={`${formatNumber(p.viewCount, locale)} ${t("views")} · ${formatNumber(p.inquiryCount, locale)} ${t("inquiries")} · ${formatNumber(p.orderCount, locale)} ${t("orders")}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("funnel.title")} description={t("funnel.hint")} />
          <CardContent className="space-y-4">
            <HBar value={funnel.matched} max={Math.max(1, funnel.matched)} label={t("funnel.matched")} meta={formatNumber(funnel.matched, locale)} accent="bg-brand-300" />
            <HBar value={funnel.quoted} max={Math.max(1, funnel.matched)} label={t("funnel.quoted")} meta={`${formatNumber(funnel.quoted, locale)} · ${conversion(funnel.matched, funnel.quoted)}`} accent="bg-brand-500" />
            <HBar value={funnel.won} max={Math.max(1, funnel.matched)} label={t("funnel.won")} meta={`${formatNumber(funnel.won, locale)} · ${conversion(funnel.quoted, funnel.won)}`} accent="bg-ink-800" />
            <p className="text-xs text-steel-500">{t("funnel.note")}</p>
          </CardContent>
        </Card>
      </div>

      {totals.adImpressions > 0 ? (
        <Card className="mt-6">
          <CardHeader title={t("ads.title")} description={t("ads.hint")} />
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <StatCard label={t("ads.impressions")} value={formatNumber(totals.adImpressions, locale)} />
            <StatCard label={t("ads.clicks")} value={formatNumber(totals.adClicks, locale)} hint={`CTR ${totals.adImpressions ? ((totals.adClicks / totals.adImpressions) * 100).toFixed(1) : "0"}%`} />
            <StatCard label={t("ads.spend")} value={formatMoney(totals.adSpendUsd, "USD", locale)} />
            <StatCard label={t("ads.cpc")} value={totals.adClicks ? formatMoney(totals.adSpendUsd / totals.adClicks, "USD", locale) : "—"} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
