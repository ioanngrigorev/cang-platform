import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BarChart, Funnel } from "@/components/admin/bar-chart";
import { Card, CardContent, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, localized } from "@/lib/utils";
import { platformAnalytics } from "@/modules/admin/analytics/queries";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin("admin.analytics.read");
  const t = await getTranslations("admin.analytics");
  const a = await platformAnalytics();
  const signups12w = a.signupSeries.reduce((s, d) => s + d.value, 0);
  const rfqs12w = a.rfqSeries.reduce((s, d) => s + d.value, 0);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("signups12w")} value={signups12w} />
        <StatCard label={t("rfqs12w")} value={rfqs12w} />
        <StatCard label={t("quotesPerRfq")} value={a.quotePerRfq.avg.toFixed(1)} hint={t("quotesPerRfqHint", { quotations: a.quotePerRfq.quotations, rfqs: a.quotePerRfq.rfqs })} />
        <StatCard label={t("conversion")} value={`${a.funnel.posted ? Math.round((a.funnel.awarded / a.funnel.posted) * 100) : 0}%`} hint={t("conversionHint")} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title={t("signupsPerWeek")} description={t("last12Weeks")} />
          <CardContent>
            <BarChart data={a.signupSeries} emptyLabel={t("noData")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("rfqsPerWeek")} description={t("last12Weeks")} />
          <CardContent>
            <BarChart data={a.rfqSeries} emptyLabel={t("noData")} />
          </CardContent>
        </Card>
        {a.currencies.length === 0 ? (
          <Card>
            <CardHeader title={t("gmvPerMonth")} description={t("last12Months")} />
            <CardContent>
              <BarChart data={[]} emptyLabel={t("noData")} />
            </CardContent>
          </Card>
        ) : (
          a.currencies.map((c) => (
            <Card key={c}>
              <CardHeader title={`${t("gmvPerMonth")} · ${c}`} description={t("last12Months")} />
              <CardContent>
                <BarChart data={a.gmvSeries[c]} format={(v) => formatMoney(v, c, locale, { compact: true })} emptyLabel={t("noData")} />
              </CardContent>
            </Card>
          ))
        )}
        <Card>
          <CardHeader title={t("funnel")} description={t("funnelHint")} />
          <CardContent>
            <Funnel
              steps={[
                { label: t("funnelPosted"), value: a.funnel.posted },
                { label: t("funnelQuoted"), value: a.funnel.quoted },
                { label: t("funnelAwarded"), value: a.funnel.awarded },
                { label: t("funnelCompleted"), value: a.funnel.completed },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("topCategoriesProducts")} />
          <CardContent>
            <BarChart orientation="horizontal" data={a.catProducts.map((c) => ({ label: localized(c, "name", locale), value: c.n }))} emptyLabel={t("noData")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("topCategoriesRfqs")} />
          <CardContent>
            <BarChart orientation="horizontal" data={a.catRfqs.map((c) => ({ label: localized(c, "name", locale), value: c.n }))} emptyLabel={t("noData")} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t("topSuppliers")} description={t("topSuppliersHint")} />
          <CardContent>
            {a.topSuppliers.length === 0 ? (
              <p className="py-6 text-center text-sm text-steel-500">{t("noData")}</p>
            ) : (
              <ol className="divide-y divide-steel-100">
                {a.topSuppliers.map((s, i) => (
                  <li key={`${s.id}-${s.currency}`} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-6 text-right text-xs tabular-nums text-steel-500">{i + 1}</span>
                    <Link href={`/admin/companies/${s.id}`} className="min-w-0 flex-1 truncate font-medium text-ink-900 hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-xs text-steel-500">{t("orders", { count: s.n })}</span>
                    <span className="w-32 text-right tabular-nums">{formatMoney(s.total, s.currency, locale)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
