import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlanDialog, SubscriptionButtons } from "@/components/admin/plan-forms";
import { Badge, Card, CardContent, CardHeader, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, localized } from "@/lib/utils";
import { SUBSCRIPTION_TABS, listPlans, listSubscriptions, subscriptionTabCounts, type SubscriptionTab } from "@/modules/admin/plans/queries";
import { UPGRADE_REQUEST } from "@/modules/admin/plans/schemas";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Plans & subscriptions", robots: { index: false } };

export default async function AdminPlansPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.plans.write");
  const t = await getTranslations("admin.plans");
  const tc = await getTranslations("admin.common");
  const tab = (SUBSCRIPTION_TABS.includes(str(sp.tab) as SubscriptionTab) ? str(sp.tab) : "requests") as SubscriptionTab;
  const page = pageParam(sp.page);
  const canWrite = canPlatform(auth, "admin.plans.write");
  const [plans, subs, counts] = await Promise.all([listPlans(), listSubscriptions({ tab, page }), subscriptionTabCounts()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={canWrite ? <PlanDialog /> : null} />

      <Card>
        <CardHeader title={t("plans")} />
        <CardContent className="p-0">
          <Table className="border-0">
            <THead>
              <TR>
                <TH>{t("colPlan")}</TH>
                <TH>{t("colTier")}</TH>
                <TH className="text-right">{t("priceMonthly")}</TH>
                <TH className="text-right">{t("priceYearly")}</TH>
                <TH className="hidden lg:table-cell">{t("colLimits")}</TH>
                <TH className="text-right">{t("colActive")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {plans.map(({ plan: p, activeSubscriptions }) => (
                <TR key={p.id}>
                  <TD>
                    <span className="font-medium">{localized(p, "name", locale)}</span>
                    <span className="block text-xs text-steel-500">
                      {p.code}
                      {p.description ? ` · ${p.description}` : ""}
                    </span>
                  </TD>
                  <TD>
                    <Badge size="sm" variant="ink">
                      {p.tier}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">{formatMoney(p.priceMonthly, p.currency, locale)}</TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">{formatMoney(p.priceYearly, p.currency, locale)}</TD>
                  <TD className="hidden text-xs text-steel-600 lg:table-cell">
                    {t("limitsSummary", { products: p.limits.maxProducts ?? "∞", seats: p.limits.teamSeats ?? "∞", analytics: p.limits.analytics })}
                  </TD>
                  <TD className="text-right tabular-nums">{activeSubscriptions}</TD>
                  <TD>
                    <span className="flex gap-1">
                      <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                      {!p.isPublic ? <Badge size="sm">{t("hidden")}</Badge> : null}
                    </span>
                  </TD>
                  <TD className="text-right">{canWrite ? <PlanDialog values={{ id: p.id, code: p.code, tier: p.tier, name: p.name, nameVi: p.nameVi, description: p.description, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, currency: p.currency, features: p.features, limits: p.limits, isPublic: p.isPublic, isActive: p.isActive, sortOrder: p.sortOrder }} /> : null}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("subscriptions")}</h2>
      <LinkTabs current={tab} className="mb-5" tabs={SUBSCRIPTION_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/plans", { tab: value }), count: counts[value] }))} />
      <Table>
        <THead>
          <TR>
            <TH>{t("colCompany")}</TH>
            <TH>{t("colPlan")}</TH>
            <TH className="hidden md:table-cell">{t("colCycle")}</TH>
            <TH className="hidden lg:table-cell">{t("colPeriod")}</TH>
            <TH>{tc("status")}</TH>
            <TH className="text-right">{tc("actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {subs.rows.length === 0 ? (
            <TR>
              <TD colSpan={6} className="py-8 text-center text-steel-500">
                {t("noSubscriptions")}
              </TD>
            </TR>
          ) : null}
          {subs.rows.map((s) => {
            const isRequest = s.status === "TRIALING" && s.externalId === UPGRADE_REQUEST;
            return (
              <TR key={s.id}>
                <TD>
                  <Link href={`/admin/companies/${s.company.id}`} className="font-medium hover:underline">
                    {s.company.name}
                  </Link>
                  <span className="block text-xs text-steel-500">{formatDate(s.createdAt, locale)}</span>
                </TD>
                <TD>
                  {s.plan.name}
                  <span className="block text-xs text-steel-500">{formatMoney(s.billingCycle === "yearly" ? s.plan.priceYearly : s.plan.priceMonthly, s.plan.currency, locale)}</span>
                </TD>
                <TD className="hidden text-xs md:table-cell">{s.billingCycle}</TD>
                <TD className="hidden whitespace-nowrap text-xs text-steel-600 lg:table-cell">
                  {formatDate(s.currentPeriodStart, locale)} → {formatDate(s.currentPeriodEnd, locale)}
                  {s.cancelAtPeriodEnd ? <span className="block text-warning-700">{t("endsAtPeriodEnd")}</span> : null}
                </TD>
                <TD>
                  {isRequest ? <Badge size="sm" variant="warning">{t("upgradeRequest")}</Badge> : <StatusBadge status={s.status} size="sm" />}
                </TD>
                <TD className="text-right">{canWrite ? <SubscriptionButtons subscriptionId={s.id} status={s.status} isRequest={isRequest} /> : null}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      <Pagination page={subs.page} totalPages={subs.totalPages} hrefFor={(n) => qs("/admin/plans", { tab, page: n })} className="mt-6" />
    </div>
  );
}
