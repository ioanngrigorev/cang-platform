import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, documents, productCategories, products, quotations, rfqInvitations, rfqItems, rfqs } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { rfqNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { getSetting } from "@/modules/settings/service";
import type { RfqFormInput } from "./schemas";

/**
 * Supplier matching for a published RFQ:
 *  1. suppliers with ACTIVE products in the RFQ category (or its subtree),
 *  2. suppliers whose primary industry matches the category's industry,
 * ranked by verification, rating and response rate. Matches receive an invitation + notification.
 */
export async function matchSuppliersForRfq(rfqId: string): Promise<string[]> {
  const rfq = await db.query.rfqs.findFirst({ where: eq(rfqs.id, rfqId), with: { category: true } });
  if (!rfq) return [];
  const limit = await getSetting("rfq.autoMatchLimit");
  const rows = await db.execute<{ id: string }>(sql`
    SELECT c.id
    FROM companies c
    LEFT JOIN manufacturer_profiles mp ON mp.company_id = c.id
    WHERE c.status = 'ACTIVE' AND c.is_seller = TRUE AND c.deleted_at IS NULL AND c.id <> ${rfq.buyerCompanyId}
      AND (
        ${rfq.categoryId ? sql`EXISTS (
          SELECT 1 FROM products p JOIN product_categories cat ON cat.id = p.category_id
          WHERE p.company_id = c.id AND p.status = 'ACTIVE'
            AND (cat.id = ${rfq.categoryId} OR cat.path LIKE '%' || ${rfq.category?.slug ?? ""} || '/%')
        )` : sql`FALSE`}
        OR ${rfq.category?.industryId ? sql`EXISTS (SELECT 1 FROM company_industries ci WHERE ci.company_id = c.id AND ci.industry_id = ${rfq.category.industryId})` : sql`FALSE`}
        OR c.search_vector @@ plainto_tsquery('simple', immutable_unaccent(${rfq.title}))
      )
    ORDER BY (CASE WHEN c.verification_status = 'VERIFIED' THEN 2 ELSE 0 END) + c.rating_avg * 0.5 + COALESCE(c.response_rate, 0) / 100 DESC, c.created_at DESC
    LIMIT ${limit}
  `);
  return rows.rows.map((r) => r.id);
}

/** Publish an RFQ: set OPEN, expiry, match suppliers and notify them. */
export async function publishRfq(rfqId: string, actorUserId: string) {
  const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
  if (!rfq) throw new ActionError("RFQ not found.", "NOT_FOUND");
  if (rfq.status !== "DRAFT" && rfq.status !== "OPEN") throw new ActionError("This RFQ cannot be published.", "INVALID_STATE");
  const validityDays = await getSetting("rfq.defaultValidityDays");
  const expiresAt = rfq.quoteDeadline ?? new Date(Date.now() + validityDays * 86400000);
  await db.update(rfqs).set({ status: "OPEN", publishedAt: rfq.publishedAt ?? new Date(), expiresAt }).where(eq(rfqs.id, rfqId));

  const supplierIds = await matchSuppliersForRfq(rfqId);
  if (supplierIds.length) {
    await db
      .insert(rfqInvitations)
      .values(supplierIds.map((supplierCompanyId) => ({ rfqId, supplierCompanyId, status: "PENDING" as const })))
      .onConflictDoNothing();
    await Promise.all(
      supplierIds.map((id) =>
        notifyCompany(id, {
          type: "RFQ_NEW_MATCH",
          title: `New RFQ matches your capabilities: ${rfq.title}`,
          body: `${rfq.quantity.toLocaleString()} ${rfq.unit} requested${rfq.destinationCountryCode ? ` · ship to ${rfq.destinationCountryCode}` : ""}. Submit your quotation before it closes.`,
          link: `/seller/rfqs/${rfqId}`,
          email: false,
        }),
      ),
    );
  }
  await audit({ actorId: actorUserId, action: "rfq.publish", entityType: "rfq", entityId: rfqId, after: { matched: supplierIds.length } });
  return supplierIds.length;
}

/** Recompute quotation counter (kept denormalised for listing pages). */
export async function refreshQuotationCount(rfqId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotations)
    .where(and(eq(quotations.rfqId, rfqId), inArray(quotations.status, ["SUBMITTED", "UNDER_REVIEW", "REVISED", "ACCEPTED"])));
  await db.update(rfqs).set({ quotationCount: row?.count ?? 0 }).where(eq(rfqs.id, rfqId));
}

/** Suppliers see: public open RFQs + RFQs they were invited to. */
export async function canSupplierViewRfq(rfqId: string, supplierCompanyId: string): Promise<boolean> {
  const [rfq] = await db.select({ status: rfqs.status, visibility: rfqs.visibility }).from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
  if (!rfq) return false;
  if (rfq.visibility === "PUBLIC" && ["OPEN", "CLOSED", "AWARDED"].includes(rfq.status)) return true;
  const [inv] = await db
    .select({ id: rfqInvitations.id })
    .from(rfqInvitations)
    .where(and(eq(rfqInvitations.rfqId, rfqId), eq(rfqInvitations.supplierCompanyId, supplierCompanyId)))
    .limit(1);
  return !!inv;
}

export async function categoryOptions() {
  return db
    .select({ id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, slug: productCategories.slug, level: productCategories.level, parentId: productCategories.parentId })
    .from(productCategories)
    .where(eq(productCategories.isActive, true))
    .orderBy(productCategories.level, productCategories.sortOrder, productCategories.name);
}

export async function supplierSummary(companyId: string) {
  const [c] = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl, verificationStatus: companies.verificationStatus, ratingAvg: companies.ratingAvg, ratingCount: companies.ratingCount })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(and(eq(products.companyId, companyId), eq(products.status, "ACTIVE")));
  return c ? { ...c, productCount: count } : null;
}

// ---------------------------------------------------------------------------------------------
// Buyer-side operations (create / edit / close / cancel / duplicate, quotation decisions)
// ---------------------------------------------------------------------------------------------

type RfqColumns = Omit<typeof rfqs.$inferInsert, "id" | "rfqNumber" | "buyerCompanyId" | "createdById" | "status" | "createdAt" | "updatedAt">;

function rfqColumnsFromInput(input: RfqFormInput): RfqColumns {
  return {
    title: input.title,
    categoryId: input.categoryId,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    targetPrice: input.targetPrice ?? null,
    targetCurrency: input.targetCurrency,
    destinationCountryCode: input.destinationCountryCode,
    destinationCity: input.destinationCity,
    incoterm: input.incoterm,
    preferredPaymentTerms: input.preferredPaymentTerms,
    quoteDeadline: input.quoteDeadline,
    requiredDeliveryDate: input.requiredDeliveryDate,
    certificationRequirements: input.certificationRequirements,
    customizationRequirements: input.customizationRequirements,
    packagingRequirements: input.packagingRequirements,
    sampleRequired: input.sampleRequired,
    visibility: input.visibility,
  };
}

/** Link uploaded documents (owned by the buyer company) to an RFQ. Ignores ids that do not belong to the company. */
async function linkRfqDocuments(rfqId: string, companyId: string, documentIds: string[]) {
  if (!documentIds.length) return;
  await db
    .update(documents)
    .set({ rfqId, type: "SPECIFICATION", visibility: "COUNTERPARTY" })
    .where(and(inArray(documents.id, documentIds), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)));
}

/** Explicit supplier invitations chosen by the buyer (in addition to auto-matching on publish). */
export async function inviteSuppliersToRfq(rfqId: string, supplierIds: string[], opts: { notify: boolean; rfqTitle: string }) {
  if (!supplierIds.length) return 0;
  const sellers = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(inArray(companies.id, supplierIds), eq(companies.isSeller, true), eq(companies.status, "ACTIVE")));
  if (!sellers.length) return 0;
  await db
    .insert(rfqInvitations)
    .values(sellers.map((s) => ({ rfqId, supplierCompanyId: s.id, status: "PENDING" as const })))
    .onConflictDoNothing();
  if (opts.notify) {
    await Promise.all(
      sellers.map((s) =>
        notifyCompany(s.id, {
          type: "RFQ_INVITATION",
          title: `You were invited to quote: ${opts.rfqTitle}`,
          body: "A buyer selected your company specifically for this request. Review the requirements and submit a quotation.",
          link: `/seller/rfqs/${rfqId}`,
        }),
      ),
    );
  }
  return sellers.length;
}

/** Create an RFQ (draft, or published when intent = publish). Returns the row. */
export async function createRfq(companyId: string, userId: string, input: RfqFormInput) {
  const rfq = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rfqs)
      .values({ rfqNumber: rfqNumber(), buyerCompanyId: companyId, createdById: userId, status: "DRAFT", ...rfqColumnsFromInput(input) })
      .returning();
    if (input.itemsJson.length) {
      await tx.insert(rfqItems).values(
        input.itemsJson.map((it, i) => ({ rfqId: row.id, productName: it.productName, specifications: it.specifications, quantity: it.quantity, unit: it.unit, targetPrice: it.targetPrice ?? null, sortOrder: i })),
      );
    }
    return row;
  });
  await linkRfqDocuments(rfq.id, companyId, input.documentIds);
  await audit({ actorId: userId, action: "rfq.create", entityType: "rfq", entityId: rfq.id, after: { title: rfq.title, intent: input.intent } });
  let matched = 0;
  if (input.intent === "publish") {
    matched = await publishRfq(rfq.id, userId);
  }
  await inviteSuppliersToRfq(rfq.id, input.invitedSupplierIds, { notify: input.intent === "publish", rfqTitle: rfq.title });
  return { rfq, matched };
}

/** Update a DRAFT RFQ (replaces items; links new documents). Optionally publishes. */
export async function updateDraftRfq(companyId: string, userId: string, rfqId: string, input: RfqFormInput) {
  const [existing] = await db.select().from(rfqs).where(and(eq(rfqs.id, rfqId), eq(rfqs.buyerCompanyId, companyId), isNull(rfqs.deletedAt))).limit(1);
  if (!existing) throw new ActionError("RFQ not found.", "NOT_FOUND");
  if (existing.status !== "DRAFT") throw new ActionError("Only draft RFQs can be edited.", "INVALID_STATE");
  await db.transaction(async (tx) => {
    await tx.update(rfqs).set(rfqColumnsFromInput(input)).where(eq(rfqs.id, rfqId));
    await tx.delete(rfqItems).where(eq(rfqItems.rfqId, rfqId));
    if (input.itemsJson.length) {
      await tx.insert(rfqItems).values(
        input.itemsJson.map((it, i) => ({ rfqId, productName: it.productName, specifications: it.specifications, quantity: it.quantity, unit: it.unit, targetPrice: it.targetPrice ?? null, sortOrder: i })),
      );
    }
  });
  await linkRfqDocuments(rfqId, companyId, input.documentIds);
  await audit({ actorId: userId, action: "rfq.update", entityType: "rfq", entityId: rfqId, after: { title: input.title } });
  let matched = 0;
  if (input.intent === "publish") matched = await publishRfq(rfqId, userId);
  await inviteSuppliersToRfq(rfqId, input.invitedSupplierIds, { notify: input.intent === "publish", rfqTitle: input.title });
  return { matched };
}

/** Publish a buyer's own draft. */
export async function publishBuyerRfq(companyId: string, userId: string, rfqId: string) {
  const [existing] = await db.select({ id: rfqs.id, status: rfqs.status, title: rfqs.title }).from(rfqs).where(and(eq(rfqs.id, rfqId), eq(rfqs.buyerCompanyId, companyId))).limit(1);
  if (!existing) throw new ActionError("RFQ not found.", "NOT_FOUND");
  if (existing.status !== "DRAFT") throw new ActionError("This RFQ is already published.", "INVALID_STATE");
  const matched = await publishRfq(rfqId, userId);
  // Notify suppliers that were invited manually while the RFQ was still a draft.
  const invited = await db.select({ supplierCompanyId: rfqInvitations.supplierCompanyId }).from(rfqInvitations).where(and(eq(rfqInvitations.rfqId, rfqId), eq(rfqInvitations.status, "PENDING")));
  await Promise.all(invited.map((i) => notifyCompany(i.supplierCompanyId, { type: "RFQ_INVITATION", title: `You were invited to quote: ${existing.title}`, link: `/seller/rfqs/${rfqId}`, email: false })));
  return matched;
}

/** Close (stop accepting quotations) or cancel an RFQ. Suppliers with active quotations are notified. */
export async function closeRfq(companyId: string, userId: string, rfqId: string, mode: "CLOSED" | "CANCELLED", reason?: string | null) {
  const [existing] = await db.select().from(rfqs).where(and(eq(rfqs.id, rfqId), eq(rfqs.buyerCompanyId, companyId))).limit(1);
  if (!existing) throw new ActionError("RFQ not found.", "NOT_FOUND");
  if (mode === "CLOSED" && existing.status !== "OPEN") throw new ActionError("Only open RFQs can be closed.", "INVALID_STATE");
  if (mode === "CANCELLED" && !["DRAFT", "OPEN"].includes(existing.status)) throw new ActionError("This RFQ can no longer be cancelled.", "INVALID_STATE");
  await db.update(rfqs).set({ status: mode, closedAt: new Date() }).where(eq(rfqs.id, rfqId));
  const pending = await db
    .select({ id: quotations.id, supplierCompanyId: quotations.supplierCompanyId })
    .from(quotations)
    .where(and(eq(quotations.rfqId, rfqId), inArray(quotations.status, ["SUBMITTED", "UNDER_REVIEW", "REVISED"])));
  if (pending.length) {
    if (mode === "CANCELLED") await db.update(quotations).set({ status: "EXPIRED" }).where(inArray(quotations.id, pending.map((p) => p.id)));
    await Promise.all(
      Array.from(new Set(pending.map((p) => p.supplierCompanyId))).map((sid) =>
        notifyCompany(sid, {
          type: "SYSTEM",
          title: mode === "CLOSED" ? `RFQ closed: ${existing.title}` : `RFQ cancelled: ${existing.title}`,
          body: reason ?? (mode === "CLOSED" ? "The buyer has stopped accepting quotations for this request." : "The buyer cancelled this request."),
          link: `/seller/rfqs/${rfqId}`,
          email: false,
        }),
      ),
    );
  }
  await audit({ actorId: userId, action: mode === "CLOSED" ? "rfq.close" : "rfq.cancel", entityType: "rfq", entityId: rfqId, before: { status: existing.status }, after: { status: mode, reason: reason ?? null } });
}

/** Duplicate an RFQ into a new DRAFT (items copied, documents not). */
export async function duplicateRfq(companyId: string, userId: string, rfqId: string) {
  const source = await db.query.rfqs.findFirst({ where: and(eq(rfqs.id, rfqId), eq(rfqs.buyerCompanyId, companyId)), with: { items: true } });
  if (!source) throw new ActionError("RFQ not found.", "NOT_FOUND");
  const copy = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rfqs)
      .values({
        rfqNumber: rfqNumber(),
        buyerCompanyId: companyId,
        createdById: userId,
        status: "DRAFT",
        title: source.title,
        categoryId: source.categoryId,
        description: source.description,
        quantity: source.quantity,
        unit: source.unit,
        targetPrice: source.targetPrice,
        targetCurrency: source.targetCurrency,
        destinationCountryCode: source.destinationCountryCode,
        destinationCity: source.destinationCity,
        incoterm: source.incoterm,
        preferredPaymentTerms: source.preferredPaymentTerms,
        quoteDeadline: null,
        requiredDeliveryDate: null,
        certificationRequirements: source.certificationRequirements,
        customizationRequirements: source.customizationRequirements,
        packagingRequirements: source.packagingRequirements,
        sampleRequired: source.sampleRequired,
        visibility: source.visibility,
      })
      .returning();
    if (source.items.length) {
      await tx.insert(rfqItems).values(source.items.map((it, i) => ({ rfqId: row.id, productName: it.productName, specifications: it.specifications, quantity: it.quantity, unit: it.unit, targetPrice: it.targetPrice, notes: it.notes, sortOrder: i })));
    }
    return row;
  });
  await audit({ actorId: userId, action: "rfq.duplicate", entityType: "rfq", entityId: copy.id, after: { sourceRfqId: rfqId } });
  return copy;
}

async function buyerQuotation(companyId: string, quotationId: string) {
  const q = await db.query.quotations.findFirst({ where: and(eq(quotations.id, quotationId), isNull(quotations.deletedAt)), with: { rfq: true } });
  if (!q || q.rfq.buyerCompanyId !== companyId) throw new ActionError("Quotation not found.", "NOT_FOUND");
  return q;
}

/** Buyer rejects a quotation with a reason; supplier is notified. */
export async function rejectQuotation(companyId: string, userId: string, quotationId: string, reason: string) {
  const q = await buyerQuotation(companyId, quotationId);
  if (!["SUBMITTED", "UNDER_REVIEW", "REVISED"].includes(q.status)) throw new ActionError("This quotation can no longer be rejected.", "INVALID_STATE");
  await db.update(quotations).set({ status: "REJECTED", respondedAt: new Date() }).where(eq(quotations.id, quotationId));
  await refreshQuotationCount(q.rfqId);
  await notifyCompany(q.supplierCompanyId, {
    type: "QUOTATION_REJECTED",
    title: `Quotation ${q.quotationNumber} was not selected`,
    body: reason,
    link: `/seller/quotations/${quotationId}`,
  });
  await audit({ actorId: userId, action: "quotation.reject", entityType: "quotation", entityId: quotationId, after: { reason } });
}

/** Buyer asks the supplier to revise a quotation (notification with the message; status → UNDER_REVIEW). */
export async function requestQuotationRevision(companyId: string, userId: string, quotationId: string, message: string) {
  const q = await buyerQuotation(companyId, quotationId);
  if (!["SUBMITTED", "UNDER_REVIEW", "REVISED"].includes(q.status)) throw new ActionError("This quotation is no longer active.", "INVALID_STATE");
  if (q.status === "SUBMITTED") await db.update(quotations).set({ status: "UNDER_REVIEW" }).where(eq(quotations.id, quotationId));
  await notifyCompany(q.supplierCompanyId, {
    type: "QUOTATION_REVISED",
    title: `Revision requested for quotation ${q.quotationNumber}`,
    body: message,
    link: `/seller/quotations/${quotationId}`,
    email: true,
  });
  await audit({ actorId: userId, action: "quotation.revisionRequested", entityType: "quotation", entityId: quotationId, after: { message } });
}

export async function saveQuotationBuyerNotes(companyId: string, quotationId: string, notes: string) {
  await buyerQuotation(companyId, quotationId);
  await db.update(quotations).set({ buyerNotes: notes || null }).where(eq(quotations.id, quotationId));
}
