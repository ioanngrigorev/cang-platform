import "server-only";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, orders, productCategories, products, quotations, rfqs, users } from "@/db/schema";

const week = (col: unknown) => sql<string>`to_char(date_trunc('week', ${col}), 'YYYY-MM-DD')`;
const month = (col: unknown) => sql<string>`to_char(date_trunc('month', ${col}), 'YYYY-MM')`;

function weekBuckets(n: number) {
  const out: string[] = [];
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
  for (let i = n - 1; i >= 0; i--) out.push(new Date(monday.getTime() - i * 7 * 86400000).toISOString().slice(0, 10));
  return out;
}
function monthBuckets(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export async function platformAnalytics() {
  const since12w = new Date(Date.now() - 12 * 7 * 86400000);
  const since12m = new Date();
  since12m.setUTCMonth(since12m.getUTCMonth() - 11, 1);
  since12m.setUTCHours(0, 0, 0, 0);

  const [signups, gmv, rfqWeeks, [quotePerRfq], catProducts, catRfqs, topSuppliers, funnelRfq, [funnelQuoted], [funnelAwarded], [funnelCompleted], [totals]] = await Promise.all([
    db.select({ bucket: week(users.createdAt), n: count() }).from(users).where(and(isNull(users.deletedAt), gte(users.createdAt, since12w))).groupBy(week(users.createdAt)),
    db
      .select({ bucket: month(orders.placedAt), currency: orders.currency, total: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
      .from(orders)
      .where(and(isNull(orders.deletedAt), gte(orders.placedAt, since12m), sql`${orders.statusCode} <> 'CANCELLED'`))
      .groupBy(month(orders.placedAt), orders.currency),
    db.select({ bucket: week(rfqs.createdAt), n: count() }).from(rfqs).where(and(isNull(rfqs.deletedAt), gte(rfqs.createdAt, since12w), sql`${rfqs.status} <> 'DRAFT'`)).groupBy(week(rfqs.createdAt)),
    db
      .select({ avg: sql<number>`coalesce(avg(${rfqs.quotationCount}), 0)::float`, rfqs: count() })
      .from(rfqs)
      .where(and(isNull(rfqs.deletedAt), sql`${rfqs.status} <> 'DRAFT'`)),
    db
      .select({ id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, n: count(products.id) })
      .from(productCategories)
      .innerJoin(products, and(eq(products.categoryId, productCategories.id), eq(products.status, "ACTIVE"), isNull(products.deletedAt)))
      .groupBy(productCategories.id)
      .orderBy(desc(count(products.id)))
      .limit(10),
    db
      .select({ id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, n: count(rfqs.id) })
      .from(productCategories)
      .innerJoin(rfqs, and(eq(rfqs.categoryId, productCategories.id), isNull(rfqs.deletedAt)))
      .groupBy(productCategories.id)
      .orderBy(desc(count(rfqs.id)))
      .limit(10),
    db
      .select({ id: companies.id, name: companies.name, currency: orders.currency, total: sql<number>`coalesce(sum(${orders.total}), 0)::float`, n: count() })
      .from(orders)
      .innerJoin(companies, eq(companies.id, orders.supplierCompanyId))
      .where(and(isNull(orders.deletedAt), sql`${orders.statusCode} <> 'CANCELLED'`))
      .groupBy(companies.id, orders.currency)
      .orderBy(desc(sql`sum(${orders.total})`))
      .limit(10),
    db.select({ status: rfqs.status, n: count() }).from(rfqs).where(and(isNull(rfqs.deletedAt), sql`${rfqs.status} <> 'DRAFT'`)).groupBy(rfqs.status),
    db.select({ n: count() }).from(rfqs).where(and(isNull(rfqs.deletedAt), sql`${rfqs.status} <> 'DRAFT'`, sql`${rfqs.quotationCount} > 0`)),
    db.select({ n: count() }).from(rfqs).where(and(isNull(rfqs.deletedAt), eq(rfqs.status, "AWARDED"))),
    db.select({ n: count() }).from(orders).where(and(isNull(orders.deletedAt), eq(orders.statusCode, "COMPLETED"), sql`${orders.rfqId} is not null`)),
    db.select({ quotations: count() }).from(quotations).where(and(isNull(quotations.deletedAt), sql`${quotations.status} <> 'DRAFT'`)),
  ]);

  const weeks = weekBuckets(12);
  const months = monthBuckets(12);
  const signupSeries = weeks.map((b) => ({ label: b.slice(5), value: signups.find((r) => r.bucket === b)?.n ?? 0, hint: b }));
  const rfqSeries = weeks.map((b) => ({ label: b.slice(5), value: rfqWeeks.find((r) => r.bucket === b)?.n ?? 0, hint: b }));
  const currencies = Array.from(new Set(gmv.map((g) => g.currency)));
  const gmvSeries = Object.fromEntries(currencies.map((c) => [c, months.map((b) => ({ label: b.slice(2), value: gmv.find((g) => g.bucket === b && g.currency === c)?.total ?? 0, hint: b }))]));
  const funnel = {
    posted: funnelRfq.reduce((s, r) => s + r.n, 0),
    quoted: funnelQuoted.n,
    awarded: funnelAwarded.n,
    completed: funnelCompleted.n,
  };
  return { signupSeries, rfqSeries, gmvSeries, currencies, quotePerRfq: { avg: quotePerRfq?.avg ?? 0, rfqs: quotePerRfq?.rfqs ?? 0, quotations: totals?.quotations ?? 0 }, catProducts, catRfqs, topSuppliers, funnel };
}
