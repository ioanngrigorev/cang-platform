import "server-only";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  conversationParticipants,
  conversations,
  messages,
  notifications,
  orders,
  payments,
  quotations,
  rfqs,
} from "@/db/schema";
import { ACTIVE_ORDER_STATUSES } from "@/modules/orders/queries";

export type BuyerOverviewStats = {
  openRfqs: number;
  draftRfqs: number;
  quotationsReceived: number;
  newQuotations: number;
  activeOrders: number;
  awaitingPayment: Array<{ currency: string; total: number }>;
  unreadMessages: number;
  unreadNotifications: number;
};

/** Everything the buyer overview header needs, in one round of parallel queries. */
export async function buyerOverviewStats(companyId: string, userId: string): Promise<BuyerOverviewStats> {
  const [rfqRows, quotationRows, orderRows, duePayments, unreadMessages, unreadNotifications] = await Promise.all([
    db
      .select({ status: rfqs.status, n: count() })
      .from(rfqs)
      .where(and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt)))
      .groupBy(rfqs.status),
    db
      .select({ status: quotations.status, n: count() })
      .from(quotations)
      .innerJoin(rfqs, eq(rfqs.id, quotations.rfqId))
      .where(and(eq(rfqs.buyerCompanyId, companyId), isNull(quotations.deletedAt), sql`${quotations.status} <> 'DRAFT'`))
      .groupBy(quotations.status),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt), inArray(orders.statusCode, ACTIVE_ORDER_STATUSES))),
    db
      .select({ currency: payments.currency, total: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(eq(payments.payerCompanyId, companyId), inArray(payments.status, ["CREATED", "PENDING", "AUTHORIZED"]), isNull(orders.deletedAt)))
      .groupBy(payments.currency),
    db
      .select({ n: count() })
      .from(messages)
      .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, messages.conversationId))
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(
        and(
          eq(conversationParticipants.userId, userId),
          eq(conversations.buyerCompanyId, companyId),
          isNull(messages.deletedAt),
          sql`${messages.senderId} is distinct from ${userId}`,
          sql`${messages.createdAt} > coalesce(${conversationParticipants.lastReadAt}, '-infinity'::timestamptz)`,
        ),
      ),
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);

  const byRfq = (statuses: string[]) => rfqRows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  const byQuotation = (statuses: string[]) => quotationRows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);

  return {
    openRfqs: byRfq(["OPEN"]),
    draftRfqs: byRfq(["DRAFT"]),
    quotationsReceived: quotationRows.reduce((s, r) => s + r.n, 0),
    newQuotations: byQuotation(["SUBMITTED", "REVISED"]),
    activeOrders: orderRows[0]?.n ?? 0,
    awaitingPayment: duePayments,
    unreadMessages: unreadMessages[0]?.n ?? 0,
    unreadNotifications: unreadNotifications[0]?.n ?? 0,
  };
}

/** Recent RFQs with their quotation counts, for the overview list. */
export async function recentBuyerRfqs(companyId: string, limit = 5) {
  return db.query.rfqs.findMany({
    where: and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt)),
    columns: { id: true, rfqNumber: true, title: true, status: true, quantity: true, unit: true, quotationCount: true, quoteDeadline: true, createdAt: true },
    orderBy: [desc(rfqs.createdAt)],
    limit,
  });
}

export async function activeBuyerOrders(companyId: string, limit = 5) {
  return db.query.orders.findMany({
    where: and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt), inArray(orders.statusCode, ACTIVE_ORDER_STATUSES)),
    columns: { id: true, orderNumber: true, statusCode: true, total: true, currency: true, expectedDeliveryDate: true, createdAt: true },
    with: { supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true } }, status: true },
    orderBy: [desc(orders.createdAt)],
    limit,
  });
}

export async function recentNotifications(userId: string, limit = 6) {
  return db
    .select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, link: notifications.link, readAt: notifications.readAt, createdAt: notifications.createdAt })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** The getting-started checklist shown until the buyer is fully set up. */
export async function buyerChecklist(companyId: string) {
  const [company] = await db
    .select({
      kybStatus: companies.kybStatus,
      description: companies.description,
      logoUrl: companies.logoUrl,
      phone: companies.phone,
      city: companies.city,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const [{ n: rfqCount }] = await db
    .select({ n: count() })
    .from(rfqs)
    .where(and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt), sql`${rfqs.status} <> 'DRAFT'`));
  const [{ n: orderCount }] = await db.select({ n: count() }).from(orders).where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)));
  return {
    profileComplete: Boolean(company?.description && company?.phone && company?.city),
    kybSubmitted: company ? company.kybStatus !== "UNVERIFIED" && company.kybStatus !== "REJECTED" : false,
    kybVerified: company?.kybStatus === "VERIFIED",
    firstRfq: rfqCount > 0,
    firstOrder: orderCount > 0,
  };
}

export async function paginationOf(searchParams: Record<string, string | string[] | undefined>, key = "page") {
  const raw = searchParams[key];
  const page = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
}
