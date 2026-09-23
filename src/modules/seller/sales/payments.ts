import "server-only";
import { and, count, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, orders, paymentProviders, payments } from "@/db/schema";

export type SellerPaymentTab = "all" | "pending" | "held" | "released" | "refunded";
export const SELLER_PAYMENT_TABS: SellerPaymentTab[] = ["all", "pending", "held", "released", "refunded"];

/** Payments where the supplier is the payee (explicitly, or through the order it supplies). */
function payeeCondition(companyId: string): SQL {
  return or(eq(payments.payeeCompanyId, companyId), and(isNull(payments.payeeCompanyId), eq(orders.supplierCompanyId, companyId)))!;
}

function tabCondition(tab: SellerPaymentTab): SQL | undefined {
  switch (tab) {
    case "pending":
      return inArray(payments.status, ["CREATED", "PENDING", "AUTHORIZED", "FAILED"]);
    case "held":
      return inArray(payments.escrowStatus, ["HELD", "PARTIALLY_RELEASED"]);
    case "released":
      return or(eq(payments.escrowStatus, "RELEASED"), and(inArray(payments.status, ["PAID", "SETTLED"]), eq(payments.escrowStatus, "NOT_APPLICABLE")));
    case "refunded":
      return or(eq(payments.status, "REFUNDED"), eq(payments.escrowStatus, "REFUNDED"));
    default:
      return undefined;
  }
}

export async function listSellerPayments(companyId: string, opts: { tab?: SellerPaymentTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = and(payeeCondition(companyId), tabCondition(opts.tab ?? "all"));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        payment: payments,
        order: { id: orders.id, orderNumber: orders.orderNumber, statusCode: orders.statusCode },
        buyer: { id: companies.id, name: companies.name, slug: companies.slug },
        provider: { id: paymentProviders.id, name: paymentProviders.name, code: paymentProviders.code },
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(companies, eq(companies.id, orders.buyerCompanyId))
      .leftJoin(paymentProviders, eq(paymentProviders.id, payments.providerId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(payments).leftJoin(orders, eq(orders.id, payments.orderId)).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function sellerPaymentTabCounts(companyId: string) {
  const countFor = async (tab: SellerPaymentTab) => {
    const [{ n }] = await db
      .select({ n: count() })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .where(and(payeeCondition(companyId), tabCondition(tab)));
    return n;
  };
  const [all, pending, held, released, refunded] = await Promise.all(SELLER_PAYMENT_TABS.map(countFor));
  return { all, pending, held, released, refunded } as Record<SellerPaymentTab, number>;
}

/** Totals per currency: held in escrow, released in the last 30 days, still pending from buyers. */
export async function sellerPaymentTotals(companyId: string) {
  const since = new Date(Date.now() - 30 * 86400000);
  return db
    .select({
      currency: payments.currency,
      held: sql<number>`coalesce(sum(case when ${payments.escrowStatus} in ('HELD','PARTIALLY_RELEASED') then ${payments.amount} else 0 end), 0)::float`,
      released30d: sql<number>`coalesce(sum(case
        when ${payments.escrowStatus} = 'RELEASED' and coalesce(${payments.releasedAt}, ${payments.settledAt}, ${payments.paidAt}) >= ${since} then ${payments.amount}
        when ${payments.escrowStatus} = 'NOT_APPLICABLE' and ${payments.status} in ('PAID','SETTLED') and coalesce(${payments.settledAt}, ${payments.paidAt}) >= ${since} then ${payments.amount}
        else 0 end), 0)::float`,
      pending: sql<number>`coalesce(sum(case when ${payments.status} in ('CREATED','PENDING','AUTHORIZED','FAILED') then ${payments.amount} else 0 end), 0)::float`,
    })
    .from(payments)
    .leftJoin(orders, eq(orders.id, payments.orderId))
    .where(payeeCondition(companyId))
    .groupBy(payments.currency)
    .orderBy(desc(sql`sum(${payments.amount})`));
}
