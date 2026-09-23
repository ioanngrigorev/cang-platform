import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { companies, orders, paymentProviders, paymentTransactions, payments } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type PaymentTab = "pending" | "held" | "released" | "refunded" | "all";
export const PAYMENT_TABS: PaymentTab[] = ["pending", "held", "released", "refunded", "all"];

const payer = alias(companies, "payer");
const payee = alias(companies, "payee");

function tabCond(tab: PaymentTab): SQL | undefined {
  switch (tab) {
    case "pending":
      return inArray(payments.status, ["PENDING", "AUTHORIZED"]);
    case "held":
      return inArray(payments.escrowStatus, ["HELD", "PARTIALLY_RELEASED", "FUNDED"]);
    case "released":
      return or(eq(payments.escrowStatus, "RELEASED"), eq(payments.status, "SETTLED"));
    case "refunded":
      return eq(payments.status, "REFUNDED");
    default:
      return undefined;
  }
}

export async function listAdminPayments(f: { tab: PaymentTab; q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  const tc = tabCond(f.tab);
  if (tc) conds.push(tc);
  if (f.q) conds.push(or(ilike(payments.paymentNumber, `%${f.q}%`), ilike(orders.orderNumber, `%${f.q}%`), ilike(payer.name, `%${f.q}%`), ilike(payee.name, `%${f.q}%`), ilike(payments.providerReference, `%${f.q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const txnCount = db.select({ n: count() }).from(paymentTransactions).where(eq(paymentTransactions.paymentId, payments.id));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        kind: payments.kind,
        method: payments.method,
        status: payments.status,
        escrowStatus: payments.escrowStatus,
        currency: payments.currency,
        amount: payments.amount,
        feeAmount: payments.feeAmount,
        milestoneLabel: payments.milestoneLabel,
        providerReference: payments.providerReference,
        dueAt: payments.dueAt,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        order: { id: orders.id, orderNumber: orders.orderNumber },
        payer: { id: payer.id, name: payer.name },
        payee: { id: payee.id, name: payee.name },
        provider: { id: paymentProviders.id, name: paymentProviders.name },
        transactions: sql<number>`(${txnCount})::int`,
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(payer, eq(payer.id, payments.payerCompanyId))
      .leftJoin(payee, eq(payee.id, payments.payeeCompanyId))
      .leftJoin(paymentProviders, eq(paymentProviders.id, payments.providerId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(payments).leftJoin(orders, eq(orders.id, payments.orderId)).leftJoin(payer, eq(payer.id, payments.payerCompanyId)).leftJoin(payee, eq(payee.id, payments.payeeCompanyId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function paymentTabCountsAll(): Promise<Record<PaymentTab, number>> {
  const out = {} as Record<PaymentTab, number>;
  await Promise.all(
    PAYMENT_TABS.map(async (tab) => {
      const [{ n }] = await db.select({ n: count() }).from(payments).where(tabCond(tab));
      out[tab] = n;
    }),
  );
  return out;
}

export async function paymentTransactionsFor(paymentIds: string[]) {
  if (!paymentIds.length) return [];
  return db.select().from(paymentTransactions).where(inArray(paymentTransactions.paymentId, paymentIds)).orderBy(desc(paymentTransactions.createdAt));
}

export async function paymentTotals() {
  return db
    .select({ currency: payments.currency, status: payments.status, total: sql<number>`coalesce(sum(${payments.amount}), 0)::float`, n: count() })
    .from(payments)
    .groupBy(payments.currency, payments.status);
}
