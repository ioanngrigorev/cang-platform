import "server-only";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, inspectionOrders, orderStatuses, orders, payments, reviews } from "@/db/schema";

export type OrderListTab = "all" | "active" | "completed" | "cancelled" | "disputed";

export const ORDER_TAB_STATUSES: Record<Exclude<OrderListTab, "all">, string[]> = {
  active: ["PURCHASE_ORDER", "PAYMENT", "PRODUCTION", "QUALITY_INSPECTION", "SHIPPING", "DELIVERY"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED"],
  disputed: ["DISPUTED"],
};

export const ACTIVE_ORDER_STATUSES = ORDER_TAB_STATUSES.active;

export async function listBuyerOrders(companyId: string, opts: { tab?: OrderListTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab = opts.tab ?? "all";
  const where = and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt), tab === "all" ? undefined : inArray(orders.statusCode, ORDER_TAB_STATUSES[tab]));
  const [rows, [{ total }]] = await Promise.all([
    db.query.orders.findMany({
      where,
      with: {
        supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true } },
        status: true,
        payments: { columns: { id: true, kind: true, status: true, amount: true, currency: true, dueAt: true, milestoneLabel: true } },
      },
      orderBy: [desc(orders.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function orderTabCounts(companyId: string) {
  const rows = await db
    .select({ status: orders.statusCode, n: count() })
    .from(orders)
    .where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)))
    .groupBy(orders.statusCode);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    all: rows.reduce((s, r) => s + r.n, 0),
    active: by(ORDER_TAB_STATUSES.active),
    completed: by(ORDER_TAB_STATUSES.completed),
    cancelled: by(ORDER_TAB_STATUSES.cancelled),
    disputed: by(ORDER_TAB_STATUSES.disputed),
  };
}

/** Rich order detail for the buyer (scoped). */
export async function getBuyerOrder(companyId: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)),
    with: {
      supplierCompany: { with: { manufacturerProfile: { columns: { factoryAddress: true } } } },
      status: true,
      rfq: { columns: { id: true, rfqNumber: true, title: true } },
      quotation: { columns: { id: true, quotationNumber: true, revisionNumber: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      events: { where: (t, { eq: e }) => e(t.isVisibleToBuyer, true), with: { actor: { columns: { id: true, name: true } } }, orderBy: (t, { asc: a }) => [a(t.createdAt)] },
      payments: { with: { provider: { columns: { id: true, name: true, code: true } }, transactions: { orderBy: (t, { desc: d }) => [d(t.createdAt)] } }, orderBy: (t, { asc: a }) => [a(t.dueAt), a(t.createdAt)] },
      invoices: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      shipments: { with: { events: { orderBy: (t, { asc: a }) => [a(t.occurredAt)] }, provider: { columns: { id: true, name: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      inspections: { with: { provider: { columns: { id: true, name: true } }, reportDocument: true }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      disputes: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      reviews: { where: (t, { eq: e }) => e(t.authorCompanyId, companyId), columns: { id: true, status: true, ratingOverall: true } },
      financingApplications: { where: (t, { eq: e }) => e(t.companyId, companyId), columns: { id: true, applicationNumber: true, status: true, amount: true, currency: true } },
      logisticsRequests: { where: (t, { eq: e }) => e(t.requesterCompanyId, companyId), columns: { id: true, requestNumber: true, status: true } },
    },
  });
  if (!order) return null;
  // Documents visible to the buyer: own company docs, counterparty/public docs, not admin-only ones.
  const visibleDocs = order.documents.filter((d) => d.ownerCompanyId === companyId || d.visibility === "COUNTERPARTY" || d.visibility === "PUBLIC");
  return { ...order, documents: visibleDocs };
}

export async function orderStatusList() {
  return db.select().from(orderStatuses).where(eq(orderStatuses.isActive, true)).orderBy(orderStatuses.sortOrder);
}

/** Orders the buyer can still review (COMPLETED without a review from this company). */
export async function ordersPendingReview(companyId: string) {
  const rows = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, completedAt: orders.completedAt, total: orders.total, currency: orders.currency, supplier: { id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl } })
    .from(orders)
    .innerJoin(companies, eq(companies.id, orders.supplierCompanyId))
    .leftJoin(reviews, and(eq(reviews.orderId, orders.id), eq(reviews.authorCompanyId, companyId), isNull(reviews.deletedAt)))
    .where(and(eq(orders.buyerCompanyId, companyId), eq(orders.statusCode, "COMPLETED"), isNull(orders.deletedAt), isNull(reviews.id)))
    .orderBy(desc(orders.completedAt));
  return rows;
}

export async function buyerOrderOptions(companyId: string, statuses?: string[]) {
  return db
    .select({ id: orders.id, orderNumber: orders.orderNumber, total: orders.total, currency: orders.currency, statusCode: orders.statusCode, supplierName: companies.name, supplierCompanyId: orders.supplierCompanyId })
    .from(orders)
    .innerJoin(companies, eq(companies.id, orders.supplierCompanyId))
    .where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt), statuses?.length ? inArray(orders.statusCode, statuses) : undefined))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

/** Small helper for the overview: sum of payment amounts the buyer still needs to pay. */
export async function awaitingPaymentTotal(companyId: string) {
  const rows = await db
    .select({ currency: payments.currency, total: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(and(eq(payments.payerCompanyId, companyId), inArray(payments.status, ["CREATED", "PENDING"]), inArray(orders.statusCode, ACTIVE_ORDER_STATUSES)))
    .groupBy(payments.currency);
  return rows;
}

export async function inspectionsForOrder(companyId: string, orderId: string) {
  return db.query.inspectionOrders.findMany({ where: and(eq(inspectionOrders.orderId, orderId), eq(inspectionOrders.requesterCompanyId, companyId)), with: { provider: true } });
}

// ---------------------------------------------------------------------------------------------
// Supplier side (scoped by supplierCompanyId) — mirrors the buyer queries above.
// ---------------------------------------------------------------------------------------------

export async function listSellerOrders(companyId: string, opts: { tab?: OrderListTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab = opts.tab ?? "all";
  const where = and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt), tab === "all" ? undefined : inArray(orders.statusCode, ORDER_TAB_STATUSES[tab]));
  const [rows, [{ total }]] = await Promise.all([
    db.query.orders.findMany({
      where,
      with: {
        buyerCompany: { columns: { id: true, name: true, slug: true, logoUrl: true, countryCode: true, verificationStatus: true } },
        status: true,
        payments: { columns: { id: true, kind: true, status: true, escrowStatus: true, amount: true, currency: true, dueAt: true, milestoneLabel: true } },
        shipments: { columns: { id: true, shipmentNumber: true, status: true, eta: true } },
      },
      orderBy: [desc(orders.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function sellerOrderTabCounts(companyId: string) {
  const rows = await db
    .select({ status: orders.statusCode, n: count() })
    .from(orders)
    .where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))
    .groupBy(orders.statusCode);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    all: rows.reduce((s, r) => s + r.n, 0),
    active: by(ORDER_TAB_STATUSES.active),
    completed: by(ORDER_TAB_STATUSES.completed),
    cancelled: by(ORDER_TAB_STATUSES.cancelled),
    disputed: by(ORDER_TAB_STATUSES.disputed),
  };
}

/** Rich order detail for the supplier (scoped): events visible to the supplier, documents it may open. */
export async function getSellerOrder(companyId: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)),
    with: {
      buyerCompany: { with: { country: { columns: { code: true, name: true, nameVi: true } } } },
      status: true,
      rfq: { columns: { id: true, rfqNumber: true, title: true } },
      quotation: { columns: { id: true, quotationNumber: true, revisionNumber: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      events: { where: (t, { eq: e }) => e(t.isVisibleToSupplier, true), with: { actor: { columns: { id: true, name: true } } }, orderBy: (t, { asc: a }) => [a(t.createdAt)] },
      payments: { with: { provider: { columns: { id: true, name: true, code: true } } }, orderBy: (t, { asc: a }) => [a(t.dueAt), a(t.createdAt)] },
      invoices: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      shipments: { with: { events: { orderBy: (t, { asc: a }) => [a(t.occurredAt)] }, provider: { columns: { id: true, name: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      inspections: { with: { provider: { columns: { id: true, name: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      disputes: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      reviews: { where: (t, { eq: e }) => e(t.targetCompanyId, companyId), columns: { id: true, status: true, ratingOverall: true, reply: true } },
      financingApplications: { where: (t, { eq: e }) => e(t.companyId, companyId), columns: { id: true, applicationNumber: true, status: true, amount: true, currency: true } },
    },
  });
  if (!order) return null;
  const visibleDocs = order.documents.filter((d) => d.ownerCompanyId === companyId || d.visibility === "COUNTERPARTY" || d.visibility === "PUBLIC");
  return { ...order, documents: visibleDocs };
}

/** Compact option rows for pickers (shipment creation, financing), optionally limited to some statuses. */
export async function sellerOrderOptions(companyId: string, statuses?: string[]) {
  return db
    .select({ id: orders.id, orderNumber: orders.orderNumber, total: orders.total, currency: orders.currency, statusCode: orders.statusCode, buyerName: companies.name, buyerCompanyId: orders.buyerCompanyId })
    .from(orders)
    .innerJoin(companies, eq(companies.id, orders.buyerCompanyId))
    .where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt), statuses?.length ? inArray(orders.statusCode, statuses) : undefined))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}
