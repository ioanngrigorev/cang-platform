import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdProductDialog, AdProductToggle, CampaignButtons } from "@/components/admin/ad-forms";
import { Card, CardContent, CardHeader, LinkTabs, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize, localized } from "@/lib/utils";
import { CAMPAIGN_TABS, adSpendSummary, campaignTabCounts, listAdProducts, listCampaigns, type CampaignTab } from "@/modules/admin/advertising/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Advertising", robots: { index: false } };

export default async function AdminAdvertisingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.advertising.write");
  const t = await getTranslations("admin.advertising");
  const tc = await getTranslations("admin.common");
  const tab = (CAMPAIGN_TABS.includes(str(sp.tab) as CampaignTab) ? str(sp.tab) : "pending") as CampaignTab;
  const page = pageParam(sp.page);
  const canWrite = canPlatform(auth, "admin.advertising.write");
  const [products, campaigns, counts, spend] = await Promise.all([listAdProducts(), listCampaigns({ tab, page }), campaignTabCounts(), adSpendSummary()]);
  const sum = (field: "budget" | "spent", statuses?: string[]) => {
    const by = new Map<string, number>();
    for (const r of spend) if (!statuses || statuses.includes(r.status)) by.set(r.currency, (by.get(r.currency) ?? 0) + r[field]);
    return [...by.entries()].map(([c, v]) => formatMoney(v, c, locale, { compact: true })).join(" · ") || formatMoney(0, "USD", locale);
  };

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={canWrite ? <AdProductDialog /> : null} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.activeBudget")} value={sum("budget", ["ACTIVE"])} hint={t("stats.activeHint", { count: counts.active })} />
        <StatCard label={t("stats.spent")} value={sum("spent")} />
        <StatCard label={t("stats.pending")} value={counts.pending} />
        <StatCard label={t("stats.products")} value={products.filter((p) => p.product.isActive).length} hint={t("stats.productsHint", { total: products.length })} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t("campaigns")}</h2>
      <LinkTabs current={tab} className="mb-5" tabs={CAMPAIGN_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/advertising", { tab: value }), count: counts[value] }))} />
      <Table>
        <THead>
          <TR>
            <TH>{t("colCampaign")}</TH>
            <TH>{t("colAdvertiser")}</TH>
            <TH className="hidden md:table-cell">{t("colPlacement")}</TH>
            <TH className="text-right">{t("colBudget")}</TH>
            <TH className="hidden lg:table-cell text-right">{t("colPerformance")}</TH>
            <TH className="hidden xl:table-cell">{t("colSchedule")}</TH>
            <TH>{tc("status")}</TH>
            <TH className="text-right">{tc("actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {campaigns.rows.length === 0 ? (
            <TR>
              <TD colSpan={8} className="py-8 text-center text-steel-500">
                {t("noCampaigns")}
              </TD>
            </TR>
          ) : null}
          {campaigns.rows.map((c) => (
            <TR key={c.id}>
              <TD className="max-w-[280px]">
                <span className="block truncate font-medium">{c.name}</span>
                {c.targeting ? <span className="block truncate text-xs text-steel-500">{[c.targeting.keywords?.join(", "), c.targeting.countries?.join(", "), c.targeting.categories?.join(", ")].filter(Boolean).join(" · ")}</span> : null}
                {c.rejectionReason ? <span className="block truncate text-xs text-danger-700">{c.rejectionReason}</span> : null}
              </TD>
              <TD>
                <Link href={`/admin/companies/${c.company.id}`} className="hover:underline">
                  {c.company.name}
                </Link>
              </TD>
              <TD className="hidden text-xs md:table-cell">
                {localized(c.product, "name", locale)}
                <span className="block text-steel-500">{c.product.pricingModel.replace(/_/g, " ")}</span>
              </TD>
              <TD className="whitespace-nowrap text-right tabular-nums">
                {formatMoney(c.spent, c.currency, locale)} <span className="text-steel-500">/ {formatMoney(c.budget, c.currency, locale)}</span>
                {c.dailyBudget ? <span className="block text-[11px] text-steel-500">{t("daily", { amount: formatMoney(c.dailyBudget, c.currency, locale) })}</span> : null}
              </TD>
              <TD className="hidden text-right text-xs tabular-nums lg:table-cell">
                {c.impressions.toLocaleString()} {t("impressions")}
                <span className="block text-steel-500">
                  {c.clicks.toLocaleString()} {t("clicks")} · {c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00"}%
                </span>
              </TD>
              <TD className="hidden whitespace-nowrap text-xs text-steel-600 xl:table-cell">
                {formatDate(c.startAt, locale)} → {c.endAt ? formatDate(c.endAt, locale) : "∞"}
              </TD>
              <TD>
                <StatusBadge status={c.status} size="sm" />
              </TD>
              <TD className="text-right">{canWrite ? <CampaignButtons campaignId={c.id} status={c.status} /> : null}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pagination page={campaigns.page} totalPages={campaigns.totalPages} hrefFor={(n) => qs("/admin/advertising", { tab, page: n })} className="mt-6" />

      <Card className="mt-8">
        <CardHeader title={t("adProducts")} description={t("adProductsHint")} />
        <CardContent className="p-0">
          <Table className="border-0">
            <THead>
              <TR>
                <TH>{t("colProduct")}</TH>
                <TH>{t("colPlacement")}</TH>
                <TH>{t("colPricing")}</TH>
                <TH className="hidden md:table-cell text-right">{t("colCampaigns")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {products.map(({ product: p, campaigns: n }) => (
                <TR key={p.id}>
                  <TD>
                    <span className="font-medium">{localized(p, "name", locale)}</span>
                    <span className="block text-xs text-steel-500">
                      {p.code}
                      {p.description ? ` · ${p.description}` : ""}
                    </span>
                  </TD>
                  <TD className="text-xs">{humanize(p.placement)}</TD>
                  <TD className="whitespace-nowrap text-xs tabular-nums">
                    {formatMoney(p.price, p.currency, locale, { maxFractionDigits: 4 })} · {p.pricingModel.replace(/_/g, " ")}
                    {p.minBudget != null ? <span className="block text-steel-500">min {formatMoney(p.minBudget, p.currency, locale)}</span> : null}
                  </TD>
                  <TD className="hidden text-right tabular-nums md:table-cell">{n}</TD>
                  <TD>
                    <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                  </TD>
                  <TD className="text-right">
                    {canWrite ? (
                      <span className="inline-flex gap-1">
                        <AdProductDialog values={{ id: p.id, code: p.code, placement: p.placement, name: p.name, nameVi: p.nameVi, description: p.description, pricingModel: p.pricingModel, price: p.price, currency: p.currency, minBudget: p.minBudget, maxSlots: p.maxSlots, sortOrder: p.sortOrder, isActive: p.isActive }} />
                        <AdProductToggle adProductId={p.id} isActive={p.isActive} />
                      </span>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
