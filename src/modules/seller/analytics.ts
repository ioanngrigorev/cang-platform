import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, quotations, rfqInvitations, supplierDailyMetrics } from "@/db/schema";

export type DailyMetric = {
  date: string;
  views: number;
  productViews: number;
  leads: number;
  rfqsReceived: number;
  quotations: number;
  orders: number;
  gmvUsd: number;
  adImpressions: number;
  adClicks: number;
  adSpendUsd: number;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Last N days of pre-aggregated metrics, with every day present (zero-filled). */
export async function sellerDailyMetrics(companyId: string, days = 30): Promise<DailyMetric[]> {
  const from = new Date(Date.now() - (days - 1) * 86400000);
  const rows = await db
    .select()
    .from(supplierDailyMetrics)
    .where(and(eq(supplierDailyMetrics.companyId, companyId), gte(supplierDailyMetrics.date, isoDay(from))))
    .orderBy(asc(supplierDailyMetrics.date));
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: DailyMetric[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDay(new Date(Date.now() - i * 86400000));
    const r = byDate.get(date);
    out.push({
      date,
      views: r?.views ?? 0,
      productViews: r?.productViews ?? 0,
      leads: r?.leads ?? 0,
      rfqsReceived: r?.rfqsReceived ?? 0,
      quotations: r?.quotations ?? 0,
      orders: r?.orders ?? 0,
      gmvUsd: r?.gmvUsd ?? 0,
      adImpressions: r?.adImpressions ?? 0,
      adClicks: r?.adClicks ?? 0,
      adSpendUsd: r?.adSpendUsd ?? 0,
    });
  }
  return out;
}

export async function topSellerProducts(companyId: string, limit = 10) {
  return db
    .select({
      id: products.id,
      title: products.title,
      titleVi: products.titleVi,
      slug: products.slug,
      status: products.status,
      viewCount: products.viewCount,
      inquiryCount: products.inquiryCount,
      rfqCount: products.rfqCount,
      orderCount: products.orderCount,
    })
    .from(products)
    .where(and(eq(products.companyId, companyId), isNull(products.deletedAt)))
    .orderBy(desc(products.viewCount), desc(products.inquiryCount))
    .limit(limit);
}

/** RFQs matched → RFQs quoted → RFQs won, all-time, counted per RFQ so the funnel never inverts. */
export async function sellerFunnel(companyId: string) {
  const [[{ matched }], [{ quoted }], [{ won }]] = await Promise.all([
    db.select({ matched: count() }).from(rfqInvitations).where(eq(rfqInvitations.supplierCompanyId, companyId)),
    db
      .select({ quoted: countDistinct(quotations.rfqId) })
      .from(quotations)
      .where(and(eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt), sql`${quotations.status} <> 'DRAFT'`)),
    db
      .select({ won: count() })
      .from(orders)
      .where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt), sql`${orders.statusCode} <> 'CANCELLED'`)),
  ]);
  // Quoted RFQs that were never an invitation still count as reach, so the top of the funnel is the max.
  return { matched: Math.max(matched, quoted), quoted, won };
}

export function sumMetrics(rows: DailyMetric[]) {
  return rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      productViews: acc.productViews + r.productViews,
      leads: acc.leads + r.leads,
      rfqsReceived: acc.rfqsReceived + r.rfqsReceived,
      quotations: acc.quotations + r.quotations,
      orders: acc.orders + r.orders,
      gmvUsd: acc.gmvUsd + r.gmvUsd,
      adImpressions: acc.adImpressions + r.adImpressions,
      adClicks: acc.adClicks + r.adClicks,
      adSpendUsd: acc.adSpendUsd + r.adSpendUsd,
    }),
    { views: 0, productViews: 0, leads: 0, rfqsReceived: 0, quotations: 0, orders: 0, gmvUsd: 0, adImpressions: 0, adClicks: 0, adSpendUsd: 0 },
  );
}
