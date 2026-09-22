import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, badges, companies, companyBadges, countries, documents, orders, productCategories, products, quotations, rfqs, savedItems } from "@/db/schema";

export type RfqListTab = "all" | "draft" | "open" | "closed" | "awarded";

const TAB_STATUSES: Record<Exclude<RfqListTab, "all">, Array<typeof rfqs.$inferSelect.status>> = {
  draft: ["DRAFT"],
  open: ["OPEN"],
  closed: ["CLOSED", "CANCELLED", "EXPIRED"],
  awarded: ["AWARDED"],
};

export async function listBuyerRfqs(companyId: string, opts: { tab?: RfqListTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab = opts.tab ?? "all";
  const where = and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt), tab === "all" ? undefined : inArray(rfqs.status, TAB_STATUSES[tab]));
  const [rows, [{ total }]] = await Promise.all([
    db.query.rfqs.findMany({
      where,
      with: { category: { columns: { id: true, name: true, nameVi: true, slug: true } } },
      orderBy: [desc(rfqs.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(rfqs).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function rfqTabCounts(companyId: string) {
  const rows = await db
    .select({ status: rfqs.status, n: count() })
    .from(rfqs)
    .where(and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt)))
    .groupBy(rfqs.status);
  const by = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    all: rows.reduce((s, r) => s + r.n, 0),
    draft: by(TAB_STATUSES.draft),
    open: by(TAB_STATUSES.open),
    closed: by(TAB_STATUSES.closed),
    awarded: by(TAB_STATUSES.awarded),
  };
}

/** Full RFQ detail for the owning buyer: items, attachments, invitations, quotations with supplier trust data. */
export async function getBuyerRfq(companyId: string, rfqId: string) {
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, rfqId), eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt)),
    with: {
      category: true,
      destinationCountry: true,
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      documents: { where: isNull(documents.deletedAt) },
      invitations: { with: { supplier: { columns: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true, ratingAvg: true, ratingCount: true } } } },
      quotations: {
        where: isNull(quotations.deletedAt),
        with: {
          items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
          supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true, ratingAvg: true, ratingCount: true, countryCode: true, city: true } },
        },
        orderBy: [desc(quotations.createdAt)],
      },
    },
  });
  if (!rfq) return null;
  const supplierIds = Array.from(new Set(rfq.quotations.map((q) => q.supplierCompanyId)));
  const badgeRows = supplierIds.length
    ? await db
        .select({ companyId: companyBadges.companyId, code: badges.code })
        .from(companyBadges)
        .innerJoin(badges, eq(badges.id, companyBadges.badgeId))
        .where(inArray(companyBadges.companyId, supplierIds))
    : [];
  const badgesBySupplier: Record<string, string[]> = {};
  for (const b of badgeRows) (badgesBySupplier[b.companyId] ??= []).push(b.code);
  return { ...rfq, badgesBySupplier };
}

export async function rfqActivity(rfqId: string) {
  return db
    .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, after: auditLogs.after, actorId: auditLogs.actorId })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "rfq"), eq(auditLogs.entityId, rfqId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(30);
}

export async function listBuyerQuotations(companyId: string, opts: { status?: string; rfqId?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const conditions = [eq(rfqs.buyerCompanyId, companyId), isNull(quotations.deletedAt), sql`${quotations.status} <> 'DRAFT'`];
  if (opts.status) conditions.push(eq(quotations.status, opts.status as typeof quotations.$inferSelect.status));
  if (opts.rfqId) conditions.push(eq(quotations.rfqId, opts.rfqId));
  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        quotation: quotations,
        rfq: { id: rfqs.id, rfqNumber: rfqs.rfqNumber, title: rfqs.title, status: rfqs.status },
        supplier: { id: companies.id, name: companies.name, slug: companies.slug, verificationStatus: companies.verificationStatus, ratingAvg: companies.ratingAvg, logoUrl: companies.logoUrl },
      })
      .from(quotations)
      .innerJoin(rfqs, eq(rfqs.id, quotations.rfqId))
      .innerJoin(companies, eq(companies.id, quotations.supplierCompanyId))
      .where(where)
      .orderBy(desc(quotations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(quotations).innerJoin(rfqs, eq(rfqs.id, quotations.rfqId)).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function buyerRfqOptions(companyId: string) {
  return db
    .select({ id: rfqs.id, rfqNumber: rfqs.rfqNumber, title: rfqs.title })
    .from(rfqs)
    .where(and(eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt)))
    .orderBy(desc(rfqs.createdAt))
    .limit(100);
}

/** Quotation detail (scoped to the buyer's RFQ) including the revision chain. */
export async function getBuyerQuotation(companyId: string, quotationId: string) {
  const q = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, quotationId), isNull(quotations.deletedAt)),
    with: {
      rfq: { with: { items: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      supplierCompany: { with: { manufacturerProfile: true, badges: { with: { badge: true } } } },
      documents: { where: isNull(documents.deletedAt) },
    },
  });
  if (!q || q.rfq.buyerCompanyId !== companyId) return null;
  // Revision chain: walk parents + children within the same RFQ + supplier.
  const chain = await db
    .select({ id: quotations.id, quotationNumber: quotations.quotationNumber, revisionNumber: quotations.revisionNumber, status: quotations.status, total: quotations.total, currency: quotations.currency, createdAt: quotations.createdAt, parentQuotationId: quotations.parentQuotationId })
    .from(quotations)
    .where(and(eq(quotations.rfqId, q.rfqId), eq(quotations.supplierCompanyId, q.supplierCompanyId), isNull(quotations.deletedAt)))
    .orderBy(asc(quotations.revisionNumber));
  const [{ productCount }] = await db.select({ productCount: count() }).from(products).where(and(eq(products.companyId, q.supplierCompanyId), eq(products.status, "ACTIVE")));
  return { ...q, revisions: chain, supplierProductCount: productCount };
}

/** The order already created from a quotation (guards against awarding the same quotation twice). */
export async function orderForQuotation(companyId: string, quotationId: string) {
  const [row] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.quotationId, quotationId), eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function countryOptions() {
  return db.select({ code: countries.code, name: countries.name, nameVi: countries.nameVi }).from(countries).where(eq(countries.isEnabled, true)).orderBy(countries.sortOrder, countries.name);
}

/** Active seller companies for the "invite suppliers" picker (searchable client-side; capped). */
export async function supplierPickerOptions(limit = 200) {
  return db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, verificationStatus: companies.verificationStatus, city: companies.city })
    .from(companies)
    .where(and(eq(companies.isSeller, true), eq(companies.status, "ACTIVE"), isNull(companies.deletedAt)))
    .orderBy(desc(companies.verificationStatus), desc(companies.ratingAvg), asc(companies.name))
    .limit(limit);
}

export async function productPrefill(productId: string) {
  const p = await db.query.products.findFirst({
    where: and(eq(products.id, productId), isNull(products.deletedAt)),
    columns: { id: true, title: true, categoryId: true, companyId: true, moq: true, unit: true, basePrice: true, currency: true, shortDescription: true },
    with: { company: { columns: { id: true, name: true } } },
  });
  return p ?? null;
}

export async function supplierPrefill(companyId: string) {
  const [c] = await db.select({ id: companies.id, name: companies.name }).from(companies).where(and(eq(companies.id, companyId), eq(companies.isSeller, true))).limit(1);
  return c ?? null;
}

export async function savedSupplierIds(userId: string) {
  const rows = await db.select({ id: savedItems.supplierCompanyId }).from(savedItems).where(and(eq(savedItems.userId, userId), eq(savedItems.type, "SUPPLIER")));
  return rows.map((r) => r.id).filter((x): x is string => !!x);
}

export async function categoryTree() {
  return db
    .select({ id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, slug: productCategories.slug, level: productCategories.level, parentId: productCategories.parentId, path: productCategories.path, sortOrder: productCategories.sortOrder })
    .from(productCategories)
    .where(eq(productCategories.isActive, true))
    .orderBy(productCategories.path, productCategories.sortOrder, productCategories.name);
}
