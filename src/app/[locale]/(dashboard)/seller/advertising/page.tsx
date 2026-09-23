import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CampaignsTable, CreateCampaignButton } from "@/components/seller/advertising-manager";
import { Card, CardContent, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { formatMoney, formatNumber, localized } from "@/lib/utils";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { adProductOptions, listSellerCampaigns } from "@/modules/seller/advertising/queries";
import { sellerActiveProductOptions } from "@/modules/seller/products/queries";

export const metadata: Metadata = { title: "Advertising", robots: { index: false } };

export default async function SellerAdvertisingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "analytics.read", seller: true });
  const auth = await getAuth();
  const canManage = canCompany(auth, "advertising.manage");
  const t = await getTranslations("seller.advertising");

  const [campaigns, adProducts, products] = await Promise.all([listSellerCampaigns(company.id), adProductOptions(), sellerActiveProductOptions(company.id)]);
  const active = campaigns.filter((c) => c.status === "ACTIVE");
  const spent = campaigns.reduce((s, c) => s + c.spent, 0);
  const budget = campaigns.filter((c) => ["ACTIVE", "PAUSED", "PENDING_REVIEW"].includes(c.status)).reduce((s, c) => s + c.budget, 0);
  const impressions = campaigns.reduce((s, c) => s + c.ads.reduce((a, ad) => a + ad.impressions, 0), 0);
  const clicks = campaigns.reduce((s, c) => s + c.ads.reduce((a, ad) => a + ad.clicks, 0), 0);
  const currency = campaigns[0]?.currency ?? "USD";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={canManage ? <CreateCampaignButton locale={locale} adProducts={adProducts.map((p) => ({ id: p.id, code: p.code, name: localized(p, "name", locale), placement: p.placement, pricingModel: p.pricingModel, price: p.price, currency: p.currency, minBudget: p.minBudget }))} products={products.map((p) => ({ id: p.id, title: localized(p, "title", locale) }))} /> : undefined}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard label={t("stats.active")} value={formatNumber(active.length, locale)} hint={t("stats.activeHint", { count: campaigns.length })} />
        <StatCard label={t("stats.spent")} value={formatMoney(spent, currency, locale)} hint={t("stats.spentHint", { budget: formatMoney(budget, currency, locale) })} />
        <StatCard label={t("stats.impressions")} value={formatNumber(impressions, locale)} />
        <StatCard label={t("stats.clicks")} value={formatNumber(clicks, locale)} hint={impressions ? `CTR ${((clicks / impressions) * 100).toFixed(1)}%` : undefined} />
      </div>

      <CampaignsTable
        locale={locale}
        canManage={canManage}
        rows={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          adProduct: { name: localized(c.adProduct, "name", locale), placement: c.adProduct.placement, pricingModel: c.adProduct.pricingModel },
          budget: c.budget,
          spent: c.spent,
          dailyBudget: c.dailyBudget,
          currency: c.currency,
          startAt: c.startAt.toISOString(),
          endAt: c.endAt ? c.endAt.toISOString() : null,
          rejectionReason: c.rejectionReason,
          target: c.ads.find((a) => a.product)?.product ? localized(c.ads.find((a) => a.product)!.product!, "title", locale) : c.ads.find((a) => a.keyword)?.keyword ?? null,
          impressions: c.ads.reduce((s, a) => s + a.impressions, 0),
          clicks: c.ads.reduce((s, a) => s + a.clicks, 0),
          leads: c.ads.reduce((s, a) => s + a.leads + a.rfqs, 0),
        }))}
      />

      <Card className="mt-6">
        <CardHeader title={t("placementsTitle")} description={t("placementsHint")} />
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adProducts.map((p) => (
            <div key={p.id} className="rounded-md border border-steel-200 p-4">
              <p className="font-medium text-ink-900">{localized(p, "name", locale)}</p>
              <p className="mt-0.5 text-xs text-steel-500">{t(`placements.${p.placement}`)}</p>
              {p.description ? <p className="mt-2 text-sm text-steel-600">{p.description}</p> : null}
              <p className="mt-2 text-sm text-ink-900">
                {formatMoney(p.price, p.currency, locale)} · {t(`pricingModels.${p.pricingModel}`)}
                {p.minBudget != null ? <span className="text-steel-500"> · {t("minBudget", { amount: formatMoney(p.minBudget, p.currency, locale) })}</span> : null}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
