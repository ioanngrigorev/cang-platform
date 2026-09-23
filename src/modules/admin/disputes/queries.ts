import "server-only";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { companies, companyMembers, disputes, orders, payments } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type DisputeTab = "open" | "review" | "resolved" | "all";
export const DISPUTE_TABS: DisputeTab[] = ["open", "review", "resolved", "all"];
const TAB_STATUS: Record<Exclude<DisputeTab, "all">, Array<typeof disputes.$inferSelect.status>> = {
  open: ["OPEN", "AWAITING_RESPONSE"],
  review: ["UNDER_REVIEW", "MEDIATION"],
  resolved: ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"],
};
export const OPEN_DISPUTE = [...TAB_STATUS.open, ...TAB_STATUS.review];

const raiser = alias(companies, "raiser");
const respondent = alias(companies, "respondent");

export async function listAdminDisputes(f: { tab: DisputeTab; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.tab !== "all") conds.push(inArray(disputes.status, TAB_STATUS[f.tab]));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: disputes.id,
        disputeNumber: disputes.disputeNumber,
        type: disputes.type,
        status: disputes.status,
        title: disputes.title,
        claimedAmount: disputes.claimedAmount,
        resolutionAmount: disputes.resolutionAmount,
        currency: disputes.currency,
        respondBy: disputes.respondBy,
        createdAt: disputes.createdAt,
        order: { id: orders.id, orderNumber: orders.orderNumber, total: orders.total },
        raiser: { id: raiser.id, name: raiser.name },
        respondent: { id: respondent.id, name: respondent.name },
      })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .innerJoin(raiser, eq(raiser.id, disputes.raisedByCompanyId))
      .innerJoin(respondent, eq(respondent.id, disputes.respondentCompanyId))
      .where(where)
      .orderBy(desc(disputes.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(disputes).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function disputeTabCounts(): Promise<Record<DisputeTab, number>> {
  const rows = await db.select({ status: disputes.status, n: count() }).from(disputes).groupBy(disputes.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { open: by(TAB_STATUS.open), review: by(TAB_STATUS.review), resolved: by(TAB_STATUS.resolved), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function getAdminDispute(disputeId: string) {
  const d = await db.query.disputes.findFirst({
    where: eq(disputes.id, disputeId),
    with: {
      order: { columns: { id: true, orderNumber: true, total: true, currency: true, statusCode: true, tradeAssuranceEnabled: true } },
      raisedByCompany: { columns: { id: true, name: true, slug: true, countryCode: true } },
      respondentCompany: { columns: { id: true, name: true, slug: true, countryCode: true } },
      resolvedBy: { columns: { id: true, name: true } },
      messages: { with: { author: { columns: { id: true, name: true, platformRole: true } } }, orderBy: (t, { asc: a }) => [a(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: dd }) => [dd(t.createdAt)] },
    },
  });
  if (!d) return null;
  const authorIds = Array.from(new Set(d.messages.map((m) => m.authorId)));
  const memberships = authorIds.length ? await db.select({ userId: companyMembers.userId, companyId: companyMembers.companyId }).from(companyMembers).where(inArray(companyMembers.userId, authorIds)) : [];
  const companyByUser: Record<string, string> = {};
  for (const m of memberships) companyByUser[m.userId] ??= m.companyId;
  const heldPayments = await db
    .select({ id: payments.id, paymentNumber: payments.paymentNumber, amount: payments.amount, currency: payments.currency, status: payments.status, escrowStatus: payments.escrowStatus })
    .from(payments)
    .where(and(eq(payments.orderId, d.orderId), inArray(payments.status, ["PAID", "SETTLED", "DISPUTED"])));
  return { ...d, companyByUser, heldPayments };
}
