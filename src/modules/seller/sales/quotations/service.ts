import { and, eq, inArray, isNull, ne, notInArray } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { documents, quotationItems, quotations, rfqInvitations, rfqItems, rfqs } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { quotationNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { canSupplierViewRfq, refreshQuotationCount } from "@/modules/rfq/service";
import { LIVE_QUOTATION_STATUSES } from "../rfqs";
import type { QuotationFormInput, QuotationItemInput } from "./schemas";

type QuotationRow = typeof quotations.$inferSelect;
type RfqRow = typeof rfqs.$inferSelect;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function computeTotals(items: QuotationItemInput[], shippingCost: number | null, discount: number | null) {
  const subtotal = round4(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
  const shipping = round4(shippingCost ?? 0);
  const disc = round4(discount ?? 0);
  return { subtotal, shippingCost: shipping, discount: disc, total: round4(subtotal + shipping - disc) };
}

/** The RFQ a supplier wants to quote: must be viewable, not its own, and OPEN when `mustBeOpen`. */
async function quotableRfq(companyId: string, rfqId: string, mustBeOpen = true): Promise<RfqRow> {
  if (!(await canSupplierViewRfq(rfqId, companyId))) throw new ActionError("RFQ not found.", "NOT_FOUND");
  const [rfq] = await db.select().from(rfqs).where(and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt))).limit(1);
  if (!rfq || rfq.buyerCompanyId === companyId) throw new ActionError("RFQ not found.", "NOT_FOUND");
  if (mustBeOpen && rfq.status !== "OPEN") throw new ActionError("This RFQ is no longer accepting quotations.", "INVALID_STATE");
  if (mustBeOpen && rfq.expiresAt && rfq.expiresAt.getTime() < Date.now()) throw new ActionError("The quotation deadline for this RFQ has passed.", "INVALID_STATE");
  return rfq;
}

async function ownQuotation(companyId: string, quotationId: string, tx?: Tx): Promise<QuotationRow> {
  const [q] = await (tx ?? db)
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt)))
    .limit(1);
  if (!q) throw new ActionError("Quotation not found.", "NOT_FOUND");
  return q;
}

/** One live quotation per supplier per RFQ: drafts and submitted quotations block a second one (revise instead). */
async function assertNoLiveQuotation(companyId: string, rfqId: string, exceptId?: string | null) {
  const [live] = await db
    .select({ id: quotations.id, status: quotations.status })
    .from(quotations)
    .where(
      and(
        eq(quotations.rfqId, rfqId),
        eq(quotations.supplierCompanyId, companyId),
        isNull(quotations.deletedAt),
        inArray(quotations.status, [...LIVE_QUOTATION_STATUSES]),
        exceptId ? ne(quotations.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (live) {
    throw new ActionError(
      live.status === "DRAFT" ? "You already have a draft quotation for this RFQ. Continue that draft instead." : "You already sent a quotation for this RFQ. Revise it instead of sending a new one.",
      "INVALID_STATE",
    );
  }
}

/** Only line items that reference real items of this RFQ keep their rfqItemId. */
async function sanitizeItems(rfqId: string, items: QuotationItemInput[]) {
  const valid = new Set((await db.select({ id: rfqItems.id }).from(rfqItems).where(eq(rfqItems.rfqId, rfqId))).map((r) => r.id));
  return items.map((it) => ({ ...it, rfqItemId: it.rfqItemId && valid.has(it.rfqItemId) ? it.rfqItemId : null }));
}

function quotationColumns(input: QuotationFormInput, totals: ReturnType<typeof computeTotals>) {
  return {
    currency: input.currency,
    subtotal: totals.subtotal,
    shippingCost: totals.shippingCost,
    discount: totals.discount,
    total: totals.total,
    moq: input.moq,
    leadTimeDays: input.leadTimeDays,
    productionTimeNote: input.productionTimeNote,
    incoterm: input.incoterm,
    shippingMethod: input.shippingMethod,
    paymentTerms: input.paymentTerms,
    notes: input.notes,
    sampleAvailable: input.sampleAvailable,
    samplePrice: input.sampleAvailable ? input.samplePrice : null,
  };
}

async function replaceItems(tx: Tx, quotationId: string, items: QuotationItemInput[]) {
  await tx.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  await tx.insert(quotationItems).values(
    items.map((it, i) => ({
      quotationId,
      rfqItemId: it.rfqItemId,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: round4(it.unitPrice),
      total: round4(it.quantity * it.unitPrice),
      notes: it.notes,
      sortOrder: i,
    })),
  );
}

/** Attach uploaded documents (owned by the supplier) to the quotation; the buyer may open them once shared. */
async function linkDocuments(companyId: string, quotationId: string, rfqId: string, documentIds: string[]) {
  await db
    .update(documents)
    .set({ quotationId: null })
    .where(and(eq(documents.quotationId, quotationId), eq(documents.ownerCompanyId, companyId), documentIds.length ? notInArray(documents.id, documentIds) : undefined));
  if (!documentIds.length) return;
  await db
    .update(documents)
    .set({ quotationId, rfqId, type: "QUOTATION", visibility: "COUNTERPARTY" })
    .where(and(inArray(documents.id, documentIds), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)));
}

const validUntilFrom = (days: number) => new Date(Date.now() + days * 86400000);

/** Create or update a DRAFT quotation (nothing is sent to the buyer). */
export async function saveQuotationDraft(companyId: string, userId: string, input: QuotationFormInput) {
  const rfq = await quotableRfq(companyId, input.rfqId);
  const items = await sanitizeItems(rfq.id, input.itemsJson);
  const totals = computeTotals(items, input.shippingCost, input.discount);
  let quotation: QuotationRow;
  if (input.quotationId) {
    const existing = await ownQuotation(companyId, input.quotationId);
    if (existing.status !== "DRAFT") throw new ActionError("Only drafts can be edited. Revise the quotation instead.", "INVALID_STATE");
    if (existing.rfqId !== rfq.id) throw new ActionError("Quotation not found.", "NOT_FOUND");
    quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(quotations)
        .set({ ...quotationColumns(input, totals), validUntil: validUntilFrom(input.validityDays) })
        .where(eq(quotations.id, existing.id))
        .returning();
      await replaceItems(tx, existing.id, items);
      return row;
    });
  } else {
    await assertNoLiveQuotation(companyId, rfq.id);
    quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(quotations)
        .values({
          quotationNumber: quotationNumber(),
          rfqId: rfq.id,
          supplierCompanyId: companyId,
          createdById: userId,
          status: "DRAFT",
          revisionNumber: 1,
          validUntil: validUntilFrom(input.validityDays),
          ...quotationColumns(input, totals),
        })
        .returning();
      await replaceItems(tx, row.id, items);
      return row;
    });
  }
  await linkDocuments(companyId, quotation.id, rfq.id, input.documentIds);
  await audit({ actorId: userId, action: "quotation.draft", entityType: "quotation", entityId: quotation.id, after: { rfqId: rfq.id, total: quotation.total, currency: quotation.currency } });
  return quotation;
}

/** Send a quotation to the buyer: creates it, or promotes the supplier's DRAFT to SUBMITTED. */
export async function submitQuotation(companyId: string, userId: string, companyName: string, input: QuotationFormInput) {
  const rfq = await quotableRfq(companyId, input.rfqId);
  const items = await sanitizeItems(rfq.id, input.itemsJson);
  const totals = computeTotals(items, input.shippingCost, input.discount);
  const now = new Date();
  let quotation: QuotationRow;
  if (input.quotationId) {
    const existing = await ownQuotation(companyId, input.quotationId);
    if (existing.status !== "DRAFT") throw new ActionError("This quotation was already sent. Revise it instead.", "INVALID_STATE");
    if (existing.rfqId !== rfq.id) throw new ActionError("Quotation not found.", "NOT_FOUND");
    await assertNoLiveQuotation(companyId, rfq.id, existing.id);
    quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(quotations)
        .set({ ...quotationColumns(input, totals), status: "SUBMITTED", submittedAt: now, validUntil: validUntilFrom(input.validityDays) })
        .where(eq(quotations.id, existing.id))
        .returning();
      await replaceItems(tx, existing.id, items);
      return row;
    });
  } else {
    await assertNoLiveQuotation(companyId, rfq.id);
    quotation = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(quotations)
        .values({
          quotationNumber: quotationNumber(),
          rfqId: rfq.id,
          supplierCompanyId: companyId,
          createdById: userId,
          status: "SUBMITTED",
          revisionNumber: 1,
          submittedAt: now,
          validUntil: validUntilFrom(input.validityDays),
          ...quotationColumns(input, totals),
        })
        .returning();
      await replaceItems(tx, row.id, items);
      return row;
    });
  }
  await linkDocuments(companyId, quotation.id, rfq.id, input.documentIds);
  await afterSubmit(companyId, userId, companyName, rfq, quotation, "quotation.submit");
  return quotation;
}

/** New revision of a sent quotation: a fresh row linked to its parent, which becomes REVISED. */
export async function reviseQuotation(companyId: string, userId: string, companyName: string, parentQuotationId: string, input: QuotationFormInput) {
  const parent = await ownQuotation(companyId, parentQuotationId);
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(parent.status)) throw new ActionError("Only a quotation that is still with the buyer can be revised.", "INVALID_STATE");
  if (parent.rfqId !== input.rfqId) throw new ActionError("Quotation not found.", "NOT_FOUND");
  const rfq = await quotableRfq(companyId, parent.rfqId);
  const items = await sanitizeItems(rfq.id, input.itemsJson);
  const totals = computeTotals(items, input.shippingCost, input.discount);
  const now = new Date();
  const quotation = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(quotations)
      .values({
        quotationNumber: quotationNumber(),
        rfqId: rfq.id,
        supplierCompanyId: companyId,
        createdById: userId,
        status: "SUBMITTED",
        revisionNumber: parent.revisionNumber + 1,
        parentQuotationId: parent.id,
        submittedAt: now,
        validUntil: validUntilFrom(input.validityDays),
        buyerNotes: parent.buyerNotes,
        ...quotationColumns(input, totals),
      })
      .returning();
    await replaceItems(tx, row.id, items);
    await tx.update(quotations).set({ status: "REVISED", respondedAt: now }).where(eq(quotations.id, parent.id));
    return row;
  });
  await linkDocuments(companyId, quotation.id, rfq.id, input.documentIds);
  await refreshQuotationCount(rfq.id);
  await notifyCompany(rfq.buyerCompanyId, {
    type: "QUOTATION_REVISED",
    title: `${companyName} revised its quotation for ${rfq.title}`,
    body: `Revision ${quotation.revisionNumber}: ${quotation.currency} ${quotation.total.toLocaleString()}${quotation.leadTimeDays ? ` · ${quotation.leadTimeDays} days` : ""}${quotation.incoterm ? ` · ${quotation.incoterm}` : ""}.`,
    link: `/buyer/quotations/${quotation.id}`,
    data: { quotationId: quotation.id, parentQuotationId: parent.id },
  });
  await audit({
    actorId: userId,
    action: "quotation.revise",
    entityType: "quotation",
    entityId: quotation.id,
    before: { parentQuotationId: parent.id, total: parent.total },
    after: { rfqId: rfq.id, total: quotation.total, currency: quotation.currency, revisionNumber: quotation.revisionNumber },
  });
  return quotation;
}

async function afterSubmit(companyId: string, userId: string, companyName: string, rfq: RfqRow, quotation: QuotationRow, action: string) {
  await refreshQuotationCount(rfq.id);
  await db
    .update(rfqInvitations)
    .set({ status: "QUOTED", viewedAt: new Date() })
    .where(and(eq(rfqInvitations.rfqId, rfq.id), eq(rfqInvitations.supplierCompanyId, companyId), ne(rfqInvitations.status, "QUOTED")));
  await notifyCompany(rfq.buyerCompanyId, {
    type: "RFQ_NEW_QUOTATION",
    title: `New quotation for ${rfq.title}`,
    body: `${companyName} quoted ${quotation.currency} ${quotation.total.toLocaleString()}${quotation.leadTimeDays ? ` · ${quotation.leadTimeDays} days lead time` : ""}${quotation.incoterm ? ` · ${quotation.incoterm}` : ""}.`,
    link: `/buyer/quotations/${quotation.id}`,
    data: { quotationId: quotation.id, rfqId: rfq.id },
  });
  await audit({ actorId: userId, action, entityType: "quotation", entityId: quotation.id, after: { rfqId: rfq.id, total: quotation.total, currency: quotation.currency } });
}

/** Withdraw a quotation the buyer has not decided on yet. */
export async function withdrawQuotation(companyId: string, userId: string, companyName: string, quotationId: string, reason: string | null) {
  const q = await ownQuotation(companyId, quotationId);
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(q.status)) throw new ActionError("This quotation can no longer be withdrawn.", "INVALID_STATE");
  await db.update(quotations).set({ status: "WITHDRAWN", respondedAt: new Date() }).where(eq(quotations.id, q.id));
  await refreshQuotationCount(q.rfqId);
  // No live quotation left → the invitation goes back to "viewed" so the supplier can quote again.
  const [stillLive] = await db
    .select({ id: quotations.id })
    .from(quotations)
    .where(and(eq(quotations.rfqId, q.rfqId), eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt), inArray(quotations.status, [...LIVE_QUOTATION_STATUSES])))
    .limit(1);
  if (!stillLive) {
    await db
      .update(rfqInvitations)
      .set({ status: "VIEWED" })
      .where(and(eq(rfqInvitations.rfqId, q.rfqId), eq(rfqInvitations.supplierCompanyId, companyId), eq(rfqInvitations.status, "QUOTED")));
  }
  const [rfq] = await db.select({ buyerCompanyId: rfqs.buyerCompanyId, title: rfqs.title }).from(rfqs).where(eq(rfqs.id, q.rfqId)).limit(1);
  if (rfq) {
    await notifyCompany(rfq.buyerCompanyId, {
      type: "SYSTEM",
      title: `${companyName} withdrew quotation ${q.quotationNumber}`,
      body: reason ?? `The quotation for "${rfq.title}" is no longer available.`,
      link: `/buyer/rfqs/${q.rfqId}`,
      email: false,
    });
  }
  await audit({ actorId: userId, action: "quotation.withdraw", entityType: "quotation", entityId: q.id, before: { status: q.status }, after: { status: "WITHDRAWN", reason } });
}

/** Discard a draft (soft delete). */
export async function deleteDraftQuotation(companyId: string, userId: string, quotationId: string) {
  const q = await ownQuotation(companyId, quotationId);
  if (q.status !== "DRAFT") throw new ActionError("Only drafts can be deleted.", "INVALID_STATE");
  await db.update(quotations).set({ deletedAt: new Date() }).where(eq(quotations.id, q.id));
  await db.update(documents).set({ quotationId: null }).where(and(eq(documents.quotationId, q.id), eq(documents.ownerCompanyId, companyId)));
  await audit({ actorId: userId, action: "quotation.deleteDraft", entityType: "quotation", entityId: q.id, after: { rfqId: q.rfqId } });
  return q;
}
