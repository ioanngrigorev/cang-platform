import "server-only";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, invoices, orders, payments } from "@/db/schema";

export type PaymentListTab = "all" | "due" | "paid" | "held";

const TAB_FILTER: Record<Exclude<PaymentListTab, "all">, Array<typeof payments.$inferSelect.status>> = {
  due: ["CREATED", "PENDING", "AUTHORIZED", "FAILED"],
  paid: ["PAID", "SETTLED"],
  held: ["PAID"],
};

/** Payments the buyer company owes (payer side), newest first. */
export async function listBuyerPayments(companyId: string, opts: { tab?: PaymentListTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab = opts.tab ?? "all";
  const conditions = [eq(payments.payerCompanyId, companyId)];
  if (tab !== "all") conditions.push(inArray(payments.status, TAB_FILTER[tab]));
  if (tab === "held") conditions.push(inArray(payments.escrowStatus, ["HELD", "PARTIALLY_RELEASED"]));
  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db.query.payments.findMany({
      where,
      with: {
        order: { columns: { id: true, orderNumber: true, statusCode: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true } } } },
        provider: { columns: { id: true, name: true, code: true } },
      },
      orderBy: [desc(payments.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(payments).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function paymentTabCounts(companyId: string) {
  const rows = await db
    .select({ status: payments.status, escrow: payments.escrowStatus, n: count() })
    .from(payments)
    .where(eq(payments.payerCompanyId, companyId))
    .groupBy(payments.status, payments.escrowStatus);
  const by = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    all: rows.reduce((s, r) => s + r.n, 0),
    due: by(TAB_FILTER.due),
    paid: by(TAB_FILTER.paid),
    held: rows.filter((r) => r.escrow === "HELD" || r.escrow === "PARTIALLY_RELEASED").reduce((s, r) => s + r.n, 0),
  };
}

/** Totals per currency for the payments dashboard. */
export async function buyerPaymentTotals(companyId: string) {
  const rows = await db
    .select({
      currency: payments.currency,
      due: sql<number>`coalesce(sum(case when ${payments.status} in ('CREATED','PENDING','AUTHORIZED','FAILED') then ${payments.amount} else 0 end), 0)::float`,
      paid: sql<number>`coalesce(sum(case when ${payments.status} in ('PAID','SETTLED') then ${payments.amount} else 0 end), 0)::float`,
      held: sql<number>`coalesce(sum(case when ${payments.escrowStatus} in ('HELD','PARTIALLY_RELEASED') then ${payments.amount} else 0 end), 0)::float`,
    })
    .from(payments)
    .where(eq(payments.payerCompanyId, companyId))
    .groupBy(payments.currency);
  return rows;
}

export async function getBuyerPayment(companyId: string, paymentId: string) {
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.payerCompanyId, companyId)),
    with: {
      order: { columns: { id: true, orderNumber: true, statusCode: true, total: true, currency: true, tradeAssuranceEnabled: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true } } } },
      provider: true,
      invoice: true,
      transactions: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
    },
  });
  return payment ?? null;
}

/** Invoices addressed to the buyer company (recipient) plus the ones raised on its orders. */
export async function listBuyerInvoices(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = eq(invoices.recipientCompanyId, companyId);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        invoice: invoices,
        order: { id: orders.id, orderNumber: orders.orderNumber },
        issuer: { id: companies.id, name: companies.name, slug: companies.slug },
      })
      .from(invoices)
      .leftJoin(orders, eq(orders.id, invoices.orderId))
      .leftJoin(companies, eq(companies.id, invoices.issuerCompanyId))
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(invoices).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBuyerInvoice(companyId: string, invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.recipientCompanyId, companyId)),
    with: {
      order: { columns: { id: true, orderNumber: true, incoterm: true, paymentTerms: true, shippingAddress: true }, with: { items: true } },
      issuerCompany: true,
      recipientCompany: true,
      payments: true,
    },
  });
  return invoice ?? null;
}

/** Payments that can still be paid, used by the overview quick actions. */
export async function nextDuePayments(companyId: string, limit = 3) {
  return db.query.payments.findMany({
    where: and(eq(payments.payerCompanyId, companyId), inArray(payments.status, ["CREATED", "PENDING"])),
    with: { order: { columns: { id: true, orderNumber: true } } },
    orderBy: (t, { asc }) => [asc(t.dueAt)],
    limit,
  });
}

/** Documents of type invoice already attached to buyer orders (used by /buyer/documents). */
export async function buyerOrderIds(companyId: string) {
  const rows = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)));
  return rows.map((r) => r.id);
}
