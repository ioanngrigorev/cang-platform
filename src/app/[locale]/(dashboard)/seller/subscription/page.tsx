import { Check, Crown } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequestUpgradeButton, WithdrawUpgradeButton } from "@/components/seller/subscription-actions";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { cn, formatDate, formatMoney, localized } from "@/lib/utils";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { getPublicPlans } from "@/modules/catalog/queries";
import { currentSubscription, freePlan, pendingUpgrade, subscriptionHistory } from "@/modules/seller/subscription/queries";

export const metadata: Metadata = { title: "Subscription", robots: { index: false } };

const TIER_RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2, ENTERPRISE: 3 };

export default async function SellerSubscriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "company.profile.read", seller: true });
  const auth = await getAuth();
  const canManage = canCompany(auth, "company.billing.manage");
  const t = await getTranslations("seller.subscription");

  const [current, pending, plans, history, fallback] = await Promise.all([currentSubscription(company.id), pendingUpgrade(company.id), getPublicPlans(), subscriptionHistory(company.id, 10), freePlan()]);
  const plan = current?.plan ?? fallback;
  const currentRank = plan ? (TIER_RANK[plan.tier] ?? 0) : 0;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {pending ? (
        <Alert variant="info" title={t("pendingTitle", { plan: localized(pending.plan, "name", locale) })} className="mb-6">
          <p>{t("pendingBody", { cycle: t(pending.billingCycle === "yearly" ? "yearly" : "monthly"), date: formatDate(pending.createdAt, locale) })}</p>
          {canManage ? (
            <div className="mt-3">
              <WithdrawUpgradeButton subscriptionId={pending.id} />
            </div>
          ) : null}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader title={t("currentPlan")} action={plan ? <Badge variant="brass"><Crown className="size-3.5" /> {localized(plan, "name", locale)}</Badge> : null} />
        <CardContent>
          {plan ? (
            <DataList
              columns={4}
              items={[
                { label: t("plan"), value: localized(plan, "name", locale) },
                { label: t("status"), value: <StatusBadge status={current?.status ?? "ACTIVE"} label={t(`statuses.${current?.status ?? "ACTIVE"}`)} /> },
                { label: t("billing"), value: current ? `${formatMoney(current.billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly, plan.currency, locale)} · ${t(current.billingCycle === "yearly" ? "yearly" : "monthly")}` : t("free") },
                { label: t("renews"), value: current ? formatDate(current.currentPeriodEnd, locale) : "—" },
                { label: t("limits.products"), value: plan.limits.maxProducts == null ? t("unlimited") : String(plan.limits.maxProducts) },
                { label: t("limits.rfqs"), value: plan.limits.maxRfqResponsesPerMonth == null ? t("unlimited") : t("perMonth", { count: plan.limits.maxRfqResponsesPerMonth }) },
                { label: t("limits.seats"), value: plan.limits.teamSeats == null ? t("unlimited") : String(plan.limits.teamSeats) },
                { label: t("limits.api"), value: plan.limits.apiAccess ? t("included") : t("notIncluded") },
              ]}
            />
          ) : (
            <p className="text-sm text-steel-500">{t("noPlan")}</p>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-ink-900">{t("plans")}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {plans.map((p) => {
          const isCurrent = plan?.id === p.id;
          const rank = TIER_RANK[p.tier] ?? 0;
          const isRequested = pending?.planId === p.id;
          return (
            <Card key={p.id} className={cn("flex flex-col", isCurrent && "border-brand-500 ring-1 ring-brand-500")}>
              <CardHeader title={localized(p, "name", locale)} description={p.description ?? undefined} action={isCurrent ? <Badge variant="success">{t("current")}</Badge> : isRequested ? <Badge variant="warning">{t("requested")}</Badge> : null} />
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    {p.priceMonthly > 0 ? formatMoney(p.priceMonthly, p.currency, locale) : p.tier === "ENTERPRISE" ? t("custom") : t("free")}
                    {p.priceMonthly > 0 ? <span className="text-sm font-normal text-steel-500"> / {t("monthShort")}</span> : null}
                  </p>
                  {p.priceYearly > 0 ? <p className="text-xs text-steel-500">{t("yearlyPrice", { amount: formatMoney(p.priceYearly, p.currency, locale) })}</p> : null}
                </div>
                <ul className="flex-1 space-y-1.5 text-sm text-steel-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-600" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <p className="text-center text-xs text-steel-500">{t("yourPlan")}</p>
                ) : canManage ? (
                  <RequestUpgradeButton planId={p.id} planName={localized(p, "name", locale)} disabled={isRequested} />
                ) : (
                  <p className="text-center text-xs text-steel-500">{rank > currentRank ? t("askOwner") : ""}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert variant="info" className="mt-6">
        {t("noPayment")}
      </Alert>

      {history.length ? (
        <Card className="mt-6">
          <CardHeader title={t("history")} />
          <CardContent className="p-0">
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>{t("plan")}</TH>
                  <TH>{t("status")}</TH>
                  <TH>{t("billing")}</TH>
                  <TH className="hidden sm:table-cell">{t("period")}</TH>
                  <TH className="hidden md:table-cell">{t("createdAt")}</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{localized(s.plan, "name", locale)}</TD>
                    <TD>
                      <StatusBadge status={s.status} label={t(`statuses.${s.status}`)} />
                    </TD>
                    <TD className="text-steel-600">{t(s.billingCycle === "yearly" ? "yearly" : "monthly")}</TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">
                      {formatDate(s.currentPeriodStart, locale)} → {formatDate(s.currentPeriodEnd, locale)}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 md:table-cell">{formatDate(s.createdAt, locale)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
