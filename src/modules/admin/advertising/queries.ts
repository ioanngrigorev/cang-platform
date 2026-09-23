import "server-only";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adProducts, advertisements, companies } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type CampaignTab = "pending" | "active" | "paused" | "finished" | "all";
export const CAMPAIGN_TABS: CampaignTab[] = ["pending", "active", "paused", "finished", "all"];
const TAB_STATUS: Record<Exclude<CampaignTab, "all">, Array<typeof adCampaigns.$inferSelect.status>> = {
  pending: ["PENDING_REVIEW", "DRAFT"],
  active: ["ACTIVE"],
  paused: ["PAUSED"],
  finished: ["COMPLETED", "REJECTED", "CANCELLED"],
};

export async function listAdProducts() {
  return db
    .select({ product: adProducts, campaigns: count(adCampaigns.id) })
    .from(adProducts)
    .leftJoin(adCampaigns, eq(adCampaigns.adProductId, adProducts.id))
    .groupBy(adProducts.id)
    .orderBy(asc(adProducts.sortOrder), asc(adProducts.name));
}

export async function listCampaigns(f: { tab: CampaignTab; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.tab !== "all") conds.push(inArray(adCampaigns.status, TAB_STATUS[f.tab]));
  const where = conds.length ? and(...conds) : undefined;
  const impressions = db.select({ n: sql<number>`coalesce(sum(${advertisements.impressions}), 0)` }).from(advertisements).where(eq(advertisements.campaignId, adCampaigns.id));
  const clicks = db.select({ n: sql<number>`coalesce(sum(${advertisements.clicks}), 0)` }).from(advertisements).where(eq(advertisements.campaignId, adCampaigns.id));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: adCampaigns.id,
        name: adCampaigns.name,
        status: adCampaigns.status,
        budget: adCampaigns.budget,
        spent: adCampaigns.spent,
        dailyBudget: adCampaigns.dailyBudget,
        currency: adCampaigns.currency,
        startAt: adCampaigns.startAt,
        endAt: adCampaigns.endAt,
        targeting: adCampaigns.targeting,
        rejectionReason: adCampaigns.rejectionReason,
        createdAt: adCampaigns.createdAt,
        company: { id: companies.id, name: companies.name },
        product: { id: adProducts.id, name: adProducts.name, nameVi: adProducts.nameVi, placement: adProducts.placement, pricingModel: adProducts.pricingModel },
        impressions: sql<number>`(${impressions})::int`,
        clicks: sql<number>`(${clicks})::int`,
      })
      .from(adCampaigns)
      .innerJoin(companies, eq(companies.id, adCampaigns.companyId))
      .innerJoin(adProducts, eq(adProducts.id, adCampaigns.adProductId))
      .where(where)
      .orderBy(desc(adCampaigns.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(adCampaigns).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function campaignTabCounts(): Promise<Record<CampaignTab, number>> {
  const rows = await db.select({ status: adCampaigns.status, n: count() }).from(adCampaigns).groupBy(adCampaigns.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { pending: by(TAB_STATUS.pending), active: by(TAB_STATUS.active), paused: by(TAB_STATUS.paused), finished: by(TAB_STATUS.finished), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function adSpendSummary() {
  return db
    .select({ currency: adCampaigns.currency, status: adCampaigns.status, budget: sql<number>`coalesce(sum(${adCampaigns.budget}), 0)::float`, spent: sql<number>`coalesce(sum(${adCampaigns.spent}), 0)::float`, n: count() })
    .from(adCampaigns)
    .groupBy(adCampaigns.currency, adCampaigns.status);
}
