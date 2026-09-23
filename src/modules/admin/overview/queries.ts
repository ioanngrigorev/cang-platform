import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, auditLogs, companies, disputes, orders, payments, products, reviews, rfqs, supportTickets, users, verifications } from "@/db/schema";
import { ACTIVE_ORDER_STATUSES } from "@/modules/orders/queries";

export const OPEN_DISPUTE_STATUSES = ["OPEN", "AWAITING_RESPONSE", "UNDER_REVIEW", "MEDIATION"] as const;

export async function adminOverviewStats() {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [[u], [c], [sellers], [buyers], [kyb], [prod], [openRfq], [activeOrders], gmv, [openDisputes], [pendingPayments], [tickets], [pendingAds], [pendingReviews]] = await Promise.all([
    db.select({ n: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ n: count() }).from(companies).where(isNull(companies.deletedAt)),
    db.select({ n: count() }).from(companies).where(and(isNull(companies.deletedAt), eq(companies.isSeller, true))),
    db.select({ n: count() }).from(companies).where(and(isNull(companies.deletedAt), eq(companies.isBuyer, true))),
    db.select({ n: count() }).from(verifications).where(and(eq(verifications.type, "KYB"), inArray(verifications.status, ["PENDING", "IN_REVIEW"]))),
    db.select({ n: count() }).from(products).where(and(eq(products.status, "PENDING_REVIEW"), isNull(products.deletedAt))),
    db.select({ n: count() }).from(rfqs).where(and(eq(rfqs.status, "OPEN"), isNull(rfqs.deletedAt))),
    db.select({ n: count() }).from(orders).where(and(inArray(orders.statusCode, ACTIVE_ORDER_STATUSES), isNull(orders.deletedAt))),
    db
      .select({ currency: orders.currency, total: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
      .from(orders)
      .where(and(isNull(orders.deletedAt), gte(orders.placedAt, since30), sql`${orders.statusCode} <> 'CANCELLED'`))
      .groupBy(orders.currency),
    db.select({ n: count() }).from(disputes).where(inArray(disputes.status, [...OPEN_DISPUTE_STATUSES])),
    db.select({ n: count() }).from(payments).where(inArray(payments.status, ["PENDING", "AUTHORIZED"])),
    db.select({ n: count() }).from(supportTickets).where(inArray(supportTickets.status, ["OPEN", "PENDING"])),
    db.select({ n: count() }).from(adCampaigns).where(eq(adCampaigns.status, "PENDING_REVIEW")),
    db.select({ n: count() }).from(reviews).where(and(inArray(reviews.status, ["PENDING", "FLAGGED"]), isNull(reviews.deletedAt))),
  ]);
  return {
    users: u.n,
    companies: c.n,
    sellers: sellers.n,
    buyers: buyers.n,
    pendingKyb: kyb.n,
    pendingProducts: prod.n,
    openRfqs: openRfq.n,
    activeOrders: activeOrders.n,
    gmv30d: gmv,
    openDisputes: openDisputes.n,
    pendingPayments: pendingPayments.n,
    openTickets: tickets.n,
    pendingAds: pendingAds.n,
    pendingReviews: pendingReviews.n,
  };
}

export async function recentAuditLogs(limit = 10) {
  return db
    .select({ log: auditLogs, actor: { id: users.id, name: users.name, email: users.email } })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function recentSignups(limit = 8) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, platformRole: users.platformRole, status: users.status, createdAt: users.createdAt })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}
