import "server-only";
import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, companies, orders, quotations, rfqs, users } from "@/db/schema";
import { canSupplierViewRfq } from "@/modules/rfq/service";
import { LIVE_QUOTATION_STATUSES } from "../rfqs";
import { QUOTATION_TABS, type QuotationTab } from "./schemas";

type QuotationStatus = typeof quotations.$inferSelect.status;

const tabStatus = (tab: QuotationTab): QuotationStatus | null => (tab === "all" ? null : (tab.toUpperCase() as QuotationStatus));

export async function listSellerQuotations(companyId: string, opts: { tab?: QuotationTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const status = tabStatus(opts.tab ?? "all");
  const where = and(eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt), status ? eq(quotations.status, status) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        quotation: quotations,
        rfq: { id: rfqs.id, rfqNumber: rfqs.rfqNumber, title: rfqs.title, status: rfqs.status },
        buyer: { id: companies.id, name: companies.name, slug: companies.slug, countryCode: companies.countryCode, verificationStatus: companies.verificationStatus },
      })
      .from(quotations)
      .innerJoin(rfqs, eq(rfqs.id, quotations.rfqId))
      .innerJoin(companies, eq(companies.id, rfqs.buyerCompanyId))
      .where(where)
      .orderBy(desc(quotations.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(quotations).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function sellerQuotationTabCounts(companyId: string) {
  const rows = await db
    .select({ status: quotations.status, n: count() })
    .from(quotations)
    .where(and(eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt)))
    .groupBy(quotations.status);
  const out = {} as Record<QuotationTab, number>;
  for (const tab of QUOTATION_TABS) {
    const status = tabStatus(tab);
    out[tab] = status ? (rows.find((r) => r.status === status)?.n ?? 0) : rows.reduce((s, r) => s + r.n, 0);
  }
  return out;
}

export type QuotationActivity = { id: string; kind: string; message: string | null; createdAt: Date; actorName: string | null; quotationId: string | null };

/** Supplier-side quotation detail: items, RFQ + buyer, attachments, revision chain and the decision trail. */
export async function getSellerQuotation(companyId: string, quotationId: string) {
  const q = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, quotationId), eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt)),
    with: {
      rfq: {
        with: {
          buyerCompany: { columns: { id: true, name: true, slug: true, logoUrl: true, countryCode: true, city: true, verificationStatus: true } },
          items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
          destinationCountry: { columns: { code: true, name: true, nameVi: true } },
        },
      },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt), orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      createdBy: { columns: { id: true, name: true } },
    },
  });
  if (!q) return null;
  const chain = await db
    .select({
      id: quotations.id,
      quotationNumber: quotations.quotationNumber,
      revisionNumber: quotations.revisionNumber,
      status: quotations.status,
      total: quotations.total,
      currency: quotations.currency,
      createdAt: quotations.createdAt,
      submittedAt: quotations.submittedAt,
      parentQuotationId: quotations.parentQuotationId,
    })
    .from(quotations)
    .where(and(eq(quotations.rfqId, q.rfqId), eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt)))
    .orderBy(asc(quotations.revisionNumber), asc(quotations.createdAt));
  const chainIds = chain.map((c) => c.id);
  const [activityRows, [order]] = await Promise.all([
    db
      .select({ id: auditLogs.id, action: auditLogs.action, entityId: auditLogs.entityId, after: auditLogs.after, createdAt: auditLogs.createdAt, actorName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(and(eq(auditLogs.entityType, "quotation"), inArray(auditLogs.entityId, chainIds)))
      .orderBy(asc(auditLogs.createdAt)),
    db
      .select({ id: orders.id, orderNumber: orders.orderNumber, statusCode: orders.statusCode })
      .from(orders)
      .where(and(inArray(orders.quotationId, chainIds), isNull(orders.deletedAt)))
      .limit(1),
  ]);
  const activity: QuotationActivity[] = activityRows.map((a) => {
    const after = (a.after ?? {}) as Record<string, unknown>;
    const message = typeof after.reason === "string" ? after.reason : typeof after.message === "string" ? after.message : null;
    return { id: a.id, kind: a.action, message, createdAt: a.createdAt, actorName: a.actorName, quotationId: a.entityId };
  });
  const latestRejection = [...activity].reverse().find((a) => a.kind === "quotation.reject" && a.quotationId === q.id) ?? null;
  const latestRevisionRequest = [...activity].reverse().find((a) => a.kind === "quotation.revisionRequested" && a.quotationId === q.id) ?? null;
  const latest = chain[chain.length - 1];
  const hasNewerRevision = chain.some((c) => c.parentQuotationId === q.id);
  return {
    ...q,
    revisions: chain,
    activity,
    order: order ?? null,
    rejectionReason: latestRejection?.message ?? null,
    revisionRequest: latestRevisionRequest ? { message: latestRevisionRequest.message, createdAt: latestRevisionRequest.createdAt } : null,
    isLatestRevision: latest?.id === q.id,
    hasNewerRevision,
  };
}

/** What the "new quotation" form needs: the RFQ (only when the supplier may quote it) and any live quotation. */
export async function quotationPrefill(companyId: string, rfqId: string) {
  if (!(await canSupplierViewRfq(rfqId, companyId))) return null;
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt)),
    with: {
      buyerCompany: { columns: { id: true, name: true, slug: true, countryCode: true, verificationStatus: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      destinationCountry: { columns: { code: true, name: true, nameVi: true } },
    },
  });
  if (!rfq || rfq.buyerCompanyId === companyId) return null;
  const live = await db.query.quotations.findFirst({
    where: and(eq(quotations.rfqId, rfqId), eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt), inArray(quotations.status, [...LIVE_QUOTATION_STATUSES])),
    with: { items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] }, documents: { where: (t, { isNull: n }) => n(t.deletedAt) } },
    orderBy: [desc(quotations.revisionNumber), desc(quotations.createdAt)],
  });
  return { rfq, liveQuotation: live ?? null };
}
