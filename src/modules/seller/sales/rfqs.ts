import "server-only";
import { and, count, desc, eq, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, countries, productCategories, quotations, rfqInvitations, rfqs } from "@/db/schema";
import { canSupplierViewRfq } from "@/modules/rfq/service";

export type SellerRfqTab = "matched" | "invited" | "all" | "quoted";
export const SELLER_RFQ_TABS: SellerRfqTab[] = ["matched", "invited", "all", "quoted"];

/** Quotation statuses that count as "this supplier is already in the running" for an RFQ. */
export const LIVE_QUOTATION_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVISED", "ACCEPTED"] as const;

export type SellerRfqFilters = { tab?: SellerRfqTab; categoryId?: string; destination?: string; q?: string; page?: number; pageSize?: number };

/**
 * Same rule as the supplier overview ("Open RFQ matches"): public OPEN RFQs in a category the supplier
 * sells in (or its subtree), plus any open RFQ it was invited to.
 */
function matchedCondition(companyId: string): SQL {
  return sql`(
    ${rfqs.status} = 'OPEN'
    AND (
      EXISTS (SELECT 1 FROM rfq_invitations ri WHERE ri.rfq_id = ${rfqs.id} AND ri.supplier_company_id = ${companyId} AND ri.status IN ('PENDING', 'VIEWED', 'QUOTED'))
      OR (
        ${rfqs.visibility} = 'PUBLIC' AND EXISTS (
          SELECT 1 FROM products p
          JOIN product_categories pc ON pc.id = p.category_id
          JOIN product_categories rc ON rc.id = ${rfqs.categoryId}
          WHERE p.company_id = ${companyId} AND p.deleted_at IS NULL AND p.status = 'ACTIVE'
            AND (pc.id = rc.id OR pc.path LIKE rc.path || rc.slug || '/%' OR rc.path LIKE pc.path || pc.slug || '/%')
        )
      )
    )
  )`;
}

function tabCondition(companyId: string, tab: SellerRfqTab): SQL | undefined {
  switch (tab) {
    case "matched":
      return matchedCondition(companyId);
    case "invited":
      return sql`EXISTS (SELECT 1 FROM rfq_invitations ri WHERE ri.rfq_id = ${rfqs.id} AND ri.supplier_company_id = ${companyId})`;
    case "quoted":
      return sql`EXISTS (SELECT 1 FROM quotations q WHERE q.rfq_id = ${rfqs.id} AND q.supplier_company_id = ${companyId} AND q.deleted_at IS NULL)`;
    case "all":
    default:
      return and(eq(rfqs.status, "OPEN"), eq(rfqs.visibility, "PUBLIC"));
  }
}

function filterConditions(companyId: string, f: SellerRfqFilters): SQL[] {
  const conds: SQL[] = [isNull(rfqs.deletedAt), ne(rfqs.buyerCompanyId, companyId)];
  if (f.categoryId) {
    conds.push(
      sql`${rfqs.categoryId} IN (
        SELECT c.id FROM product_categories c
        WHERE c.id = ${f.categoryId}
           OR c.path LIKE (SELECT p.path || p.slug || '/%' FROM product_categories p WHERE p.id = ${f.categoryId})
      )`,
    );
  }
  if (f.destination) conds.push(eq(rfqs.destinationCountryCode, f.destination.toUpperCase()));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(or(sql`${rfqs.title} ILIKE ${like}`, sql`${rfqs.rfqNumber} ILIKE ${like}`, sql`${rfqs.description} ILIKE ${like}`)!);
  }
  return conds;
}

const myQuotationStatus = (companyId: string) =>
  sql<string | null>`(SELECT q.status FROM quotations q WHERE q.rfq_id = ${rfqs.id} AND q.supplier_company_id = ${companyId} AND q.deleted_at IS NULL ORDER BY q.revision_number DESC, q.created_at DESC LIMIT 1)`;
const myQuotationId = (companyId: string) =>
  sql<string | null>`(SELECT q.id FROM quotations q WHERE q.rfq_id = ${rfqs.id} AND q.supplier_company_id = ${companyId} AND q.deleted_at IS NULL ORDER BY q.revision_number DESC, q.created_at DESC LIMIT 1)`;

/** RFQ marketplace rows for a supplier, with its own invitation + quotation state per row. */
export async function listSellerRfqs(companyId: string, f: SellerRfqFilters = {}) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = f.pageSize ?? 20;
  const tab = f.tab ?? "matched";
  const where = and(...filterConditions(companyId, f), tabCondition(companyId, tab));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: rfqs.id,
        rfqNumber: rfqs.rfqNumber,
        title: rfqs.title,
        status: rfqs.status,
        visibility: rfqs.visibility,
        quantity: rfqs.quantity,
        unit: rfqs.unit,
        targetPrice: rfqs.targetPrice,
        targetCurrency: rfqs.targetCurrency,
        incoterm: rfqs.incoterm,
        destinationCity: rfqs.destinationCity,
        destinationCountryCode: rfqs.destinationCountryCode,
        quoteDeadline: rfqs.quoteDeadline,
        expiresAt: rfqs.expiresAt,
        publishedAt: rfqs.publishedAt,
        createdAt: rfqs.createdAt,
        isPriority: rfqs.isPriority,
        quotationCount: rfqs.quotationCount,
        buyer: { id: companies.id, name: companies.name, slug: companies.slug, countryCode: companies.countryCode, verificationStatus: companies.verificationStatus },
        category: { id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, slug: productCategories.slug },
        destinationCountry: { code: countries.code, name: countries.name, nameVi: countries.nameVi },
        invitationStatus: rfqInvitations.status,
        myQuotationStatus: myQuotationStatus(companyId),
        myQuotationId: myQuotationId(companyId),
      })
      .from(rfqs)
      .innerJoin(companies, eq(companies.id, rfqs.buyerCompanyId))
      .leftJoin(productCategories, eq(productCategories.id, rfqs.categoryId))
      .leftJoin(countries, eq(countries.code, rfqs.destinationCountryCode))
      .leftJoin(rfqInvitations, and(eq(rfqInvitations.rfqId, rfqs.id), eq(rfqInvitations.supplierCompanyId, companyId)))
      .where(where)
      .orderBy(desc(rfqs.isPriority), desc(sql`coalesce(${rfqs.publishedAt}, ${rfqs.createdAt})`))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(rfqs).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function sellerRfqTabCounts(companyId: string, f: Omit<SellerRfqFilters, "tab" | "page" | "pageSize"> = {}) {
  const base = filterConditions(companyId, f);
  const countFor = async (tab: SellerRfqTab) => {
    const [{ n }] = await db
      .select({ n: count() })
      .from(rfqs)
      .where(and(...base, tabCondition(companyId, tab)));
    return n;
  };
  const [matched, invited, all, quoted] = await Promise.all(SELLER_RFQ_TABS.map(countFor));
  return { matched, invited, all, quoted } as Record<SellerRfqTab, number>;
}

/** Full RFQ detail as the supplier sees it. Returns null when the supplier may not view it. */
export async function getSellerRfq(companyId: string, rfqId: string) {
  if (!(await canSupplierViewRfq(rfqId, companyId))) return null;
  const rfq = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt)),
    with: {
      buyerCompany: {
        columns: { id: true, name: true, slug: true, logoUrl: true, countryCode: true, city: true, verificationStatus: true, businessType: true, transactionCount: true, yearEstablished: true },
        with: { country: { columns: { code: true, name: true, nameVi: true } } },
      },
      category: { columns: { id: true, name: true, nameVi: true, slug: true } },
      destinationCountry: { columns: { code: true, name: true, nameVi: true } },
      items: { orderBy: (t, { asc: a }) => [a(t.sortOrder)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt) },
      invitations: { where: (t, { eq: e }) => e(t.supplierCompanyId, companyId) },
      quotations: {
        where: and(eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt)),
        columns: { id: true, quotationNumber: true, status: true, revisionNumber: true, total: true, currency: true, createdAt: true, submittedAt: true, validUntil: true },
        orderBy: [desc(quotations.revisionNumber), desc(quotations.createdAt)],
      },
    },
  });
  if (!rfq || rfq.buyerCompanyId === companyId) return null;
  const visibleDocs = rfq.documents.filter((d) => d.ownerCompanyId === companyId || d.visibility === "COUNTERPARTY" || d.visibility === "PUBLIC");
  const liveQuotation = rfq.quotations.find((q) => (LIVE_QUOTATION_STATUSES as readonly string[]).includes(q.status)) ?? null;
  return { ...rfq, documents: visibleDocs, invitation: rfq.invitations[0] ?? null, liveQuotation, myQuotations: rfq.quotations };
}

/** A PENDING invitation becomes VIEWED the first time the supplier opens the RFQ. */
export async function markInvitationViewed(companyId: string, rfqId: string) {
  await db
    .update(rfqInvitations)
    .set({ status: "VIEWED", viewedAt: new Date() })
    .where(and(eq(rfqInvitations.rfqId, rfqId), eq(rfqInvitations.supplierCompanyId, companyId), eq(rfqInvitations.status, "PENDING")));
}

/** Destination countries present on open RFQs (for the filter). */
export async function rfqDestinationOptions() {
  return db
    .selectDistinct({ code: countries.code, name: countries.name, nameVi: countries.nameVi })
    .from(rfqs)
    .innerJoin(countries, eq(countries.code, rfqs.destinationCountryCode))
    .where(and(eq(rfqs.status, "OPEN"), isNull(rfqs.deletedAt)))
    .orderBy(countries.name);
}
