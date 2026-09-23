import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { companies, orderStatuses, orders } from "@/db/schema";
import { ORDER_TAB_STATUSES, type OrderListTab } from "@/modules/orders/queries";
import { PAGE_SIZE, pageInfo } from "../shared";

export const ADMIN_ORDER_TABS: OrderListTab[] = ["all", "active", "completed", "disputed", "cancelled"];

const buyer = alias(companies, "buyer");
const supplier = alias(companies, "supplier");

function conds(f: { tab: OrderListTab; q?: string }): SQL[] {
  const out: SQL[] = [isNull(orders.deletedAt)];
  if (f.tab !== "all") out.push(inArray(orders.statusCode, ORDER_TAB_STATUSES[f.tab]));
  if (f.q) out.push(or(ilike(orders.orderNumber, `%${f.q}%`), ilike(buyer.name, `%${f.q}%`), ilike(supplier.name, `%${f.q}%`))!);
  return out;
}

export async function listAdminOrders(f: { tab: OrderListTab; q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds(f));
  const base = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      statusCode: orders.statusCode,
      total: orders.total,
      currency: orders.currency,
      tradeAssuranceEnabled: orders.tradeAssuranceEnabled,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      buyer: { id: buyer.id, name: buyer.name },
      supplier: { id: supplier.id, name: supplier.name },
      status: { name: orderStatuses.name, nameVi: orderStatuses.nameVi },
    })
    .from(orders)
    .innerJoin(buyer, eq(buyer.id, orders.buyerCompanyId))
    .innerJoin(supplier, eq(supplier.id, orders.supplierCompanyId))
    .leftJoin(orderStatuses, eq(orderStatuses.code, orders.statusCode))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const [rows, [{ total }]] = await Promise.all([
    base,
    db.select({ total: count() }).from(orders).innerJoin(buyer, eq(buyer.id, orders.buyerCompanyId)).innerJoin(supplier, eq(supplier.id, orders.supplierCompanyId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function adminOrderTabCounts(): Promise<Record<OrderListTab, number>> {
  const rows = await db.select({ status: orders.statusCode, n: count() }).from(orders).where(isNull(orders.deletedAt)).groupBy(orders.statusCode);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { all: rows.reduce((s, r) => s + r.n, 0), active: by(ORDER_TAB_STATUSES.active), completed: by(ORDER_TAB_STATUSES.completed), cancelled: by(ORDER_TAB_STATUSES.cancelled), disputed: by(ORDER_TAB_STATUSES.disputed) };
}

/** Full order for staff: every event (including ones hidden from a party) and every document. */
export async function getAdminOrder(orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), isNull(orders.deletedAt)),
    with: {
      buyerCompany: { columns: { id: true, name: true, slug: true, countryCode: true, verificationStatus: true } },
      supplierCompany: { columns: { id: true, name: true, slug: true, countryCode: true, verificationStatus: true } },
      status: true,
      rfq: { columns: { id: true, rfqNumber: true, title: true } },
      quotation: { columns: { id: true, quotationNumber: true, revisionNumber: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      events: { with: { actor: { columns: { id: true, name: true } } }, orderBy: (t, { asc: a }) => [a(t.createdAt)] },
      payments: { with: { provider: { columns: { id: true, name: true, code: true } }, transactions: { orderBy: (t, { desc: d }) => [d(t.createdAt)] } }, orderBy: (t, { asc: a }) => [a(t.dueAt), a(t.createdAt)] },
      invoices: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      shipments: { with: { events: { orderBy: (t, { asc: a }) => [a(t.occurredAt)] }, provider: { columns: { id: true, name: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      inspections: { with: { provider: { columns: { id: true, name: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      disputes: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      commissions: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
    },
  });
}
