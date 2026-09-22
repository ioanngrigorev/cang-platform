import "server-only";
import { and, count, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { companies, disputes, orders } from "@/db/schema";

export async function listCompanyDisputes(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = or(eq(disputes.raisedByCompanyId, companyId), eq(disputes.respondentCompanyId, companyId));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        dispute: disputes,
        order: { id: orders.id, orderNumber: orders.orderNumber },
        respondent: { id: companies.id, name: companies.name, slug: companies.slug },
      })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .innerJoin(companies, eq(companies.id, disputes.respondentCompanyId))
      .where(where)
      .orderBy(desc(disputes.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(disputes).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCompanyDispute(companyId: string, disputeId: string) {
  const d = await db.query.disputes.findFirst({
    where: and(eq(disputes.id, disputeId), or(eq(disputes.raisedByCompanyId, companyId), eq(disputes.respondentCompanyId, companyId))),
    with: {
      order: { columns: { id: true, orderNumber: true, total: true, currency: true, statusCode: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true } } } },
      raisedByCompany: { columns: { id: true, name: true, slug: true } },
      respondentCompany: { columns: { id: true, name: true, slug: true } },
      resolvedBy: { columns: { id: true, name: true } },
      messages: { where: (t, { eq: e }) => e(t.isInternal, false), with: { author: { columns: { id: true, name: true } } }, orderBy: (t, { asc: a }) => [a(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: dd }) => [dd(t.createdAt)] },
    },
  });
  if (!d) return null;
  // Which company does each message author belong to? (needed to render "you" vs counterparty)
  const authorIds = Array.from(new Set(d.messages.map((m) => m.authorId)));
  const memberships = authorIds.length
    ? await db.query.companyMembers.findMany({ where: (t, { inArray: i }) => i(t.userId, authorIds), columns: { userId: true, companyId: true } })
    : [];
  const companyByUser: Record<string, string> = {};
  for (const m of memberships) companyByUser[m.userId] ??= m.companyId;
  return { ...d, companyByUser, documents: d.documents.filter((doc) => doc.visibility !== "ADMIN" && doc.visibility !== "PRIVATE") };
}

export async function openDisputeCount(companyId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(disputes)
    .where(and(or(eq(disputes.raisedByCompanyId, companyId), eq(disputes.respondentCompanyId, companyId)), or(eq(disputes.status, "OPEN"), eq(disputes.status, "AWAITING_RESPONSE"), eq(disputes.status, "UNDER_REVIEW"), eq(disputes.status, "MEDIATION"))));
  return n;
}
