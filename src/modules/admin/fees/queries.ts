import "server-only";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { commissions, companies, feeRules, orders, plans } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export async function listFeeRules() {
  return db.query.feeRules.findMany({ with: { plan: { columns: { id: true, code: true, name: true } } }, orderBy: [asc(feeRules.type), desc(feeRules.priority), asc(feeRules.name)] });
}

export async function planOptions() {
  return db.select({ id: plans.id, code: plans.code, name: plans.name }).from(plans).orderBy(asc(plans.sortOrder));
}

export async function listCommissions(f: { status?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(commissions.status, f.status as typeof commissions.$inferSelect.status));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }], totals] = await Promise.all([
    db
      .select({
        id: commissions.id,
        type: commissions.type,
        status: commissions.status,
        currency: commissions.currency,
        baseAmount: commissions.baseAmount,
        rate: commissions.rate,
        amount: commissions.amount,
        note: commissions.note,
        collectedAt: commissions.collectedAt,
        createdAt: commissions.createdAt,
        company: { id: companies.id, name: companies.name },
        order: { id: orders.id, orderNumber: orders.orderNumber },
        rule: { id: feeRules.id, code: feeRules.code, name: feeRules.name },
      })
      .from(commissions)
      .innerJoin(companies, eq(companies.id, commissions.companyId))
      .leftJoin(orders, eq(orders.id, commissions.orderId))
      .leftJoin(feeRules, eq(feeRules.id, commissions.feeRuleId))
      .where(where)
      .orderBy(desc(commissions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(commissions).where(where),
    db.select({ status: commissions.status, currency: commissions.currency, total: sql<number>`coalesce(sum(${commissions.amount}), 0)::float`, n: count() }).from(commissions).groupBy(commissions.status, commissions.currency),
  ]);
  return { rows, totals, ...pageInfo(total, page) };
}
