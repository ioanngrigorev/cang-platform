import "server-only";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, plans, subscriptions } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";
import { UPGRADE_REQUEST } from "./schemas";

export type SubscriptionTab = "requests" | "active" | "all";
export const SUBSCRIPTION_TABS: SubscriptionTab[] = ["requests", "active", "all"];

export async function listPlans() {
  const rows = await db
    .select({ plan: plans, activeSubscriptions: count(subscriptions.id) })
    .from(plans)
    .leftJoin(subscriptions, and(eq(subscriptions.planId, plans.id), eq(subscriptions.status, "ACTIVE")))
    .groupBy(plans.id)
    .orderBy(asc(plans.sortOrder));
  return rows;
}

export async function listSubscriptions(f: { tab: SubscriptionTab; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.tab === "requests") conds.push(eq(subscriptions.status, "TRIALING"), eq(subscriptions.externalId, UPGRADE_REQUEST));
  if (f.tab === "active") conds.push(eq(subscriptions.status, "ACTIVE"));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        billingCycle: subscriptions.billingCycle,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        externalId: subscriptions.externalId,
        createdAt: subscriptions.createdAt,
        company: { id: companies.id, name: companies.name },
        plan: { id: plans.id, code: plans.code, name: plans.name, tier: plans.tier, priceMonthly: plans.priceMonthly, priceYearly: plans.priceYearly, currency: plans.currency },
      })
      .from(subscriptions)
      .innerJoin(companies, eq(companies.id, subscriptions.companyId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(where)
      .orderBy(desc(subscriptions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(subscriptions).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function subscriptionTabCounts(): Promise<Record<SubscriptionTab, number>> {
  const [[req], [act], [all]] = await Promise.all([
    db.select({ n: count() }).from(subscriptions).where(and(eq(subscriptions.status, "TRIALING"), eq(subscriptions.externalId, UPGRADE_REQUEST))),
    db.select({ n: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE")),
    db.select({ n: count() }).from(subscriptions),
  ]);
  return { requests: req.n, active: act.n, all: all.n };
}
