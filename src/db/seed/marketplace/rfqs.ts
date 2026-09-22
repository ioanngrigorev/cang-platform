/**
 * Step 3 — RFQs, RFQ items, supplier invitations, quotations (incl. one revision chain) and quotation items.
 */
import type { Db } from "@/db";
import { quotationItems, quotations, rfqInvitations, rfqItems, rfqs } from "@/db/schema";
import { quotationNumber, rfqNumber } from "@/lib/ids";
import { RFQS } from "../data/scenarios";
import { insertAll, type World } from "./context";
import { round4 } from "./rng";

type RfqRow = typeof rfqs.$inferInsert;
type RfqItemRow = typeof rfqItems.$inferInsert;
type InvitationRow = typeof rfqInvitations.$inferInsert;
type QuotationRow = typeof quotations.$inferInsert;
type QuotationItemRow = typeof quotationItems.$inferInsert;

const COUNTED_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW", "REVISED", "ACCEPTED"]);

export async function seedRfqs(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const rfqRows: RfqRow[] = [];
  const itemRows: RfqItemRow[] = [];
  const invitationRows: InvitationRow[] = [];
  const quotationRows: QuotationRow[] = [];
  const quotationItemRows: QuotationItemRow[] = [];

  for (const r of RFQS) {
    const buyer = w.buyer(r.buyer);
    const rfqId = rng.id();
    const number = rfqNumber();
    const publishedAt = r.publishedDaysAgo !== undefined ? w.daysAgo(r.publishedDaysAgo) : null;
    const createdAt = publishedAt ? new Date(publishedAt.getTime() - rng.int(1, 3) * 86_400_000) : w.daysAgo(rng.int(1, 4));
    const quoteDeadline = w.daysFromNow(r.deadlineDays);
    const closedAt = r.closedDaysAgo !== undefined ? w.daysAgo(r.closedDaysAgo) : null;
    const rfqItemIds = r.items.map(() => rng.id());

    r.items.forEach((it, i) =>
      itemRows.push({ id: rfqItemIds[i], rfqId, productName: it.productName, specifications: it.specifications, quantity: it.quantity, unit: it.unit, targetPrice: it.targetPrice ?? null, notes: it.notes ?? null, sortOrder: i }),
    );

    for (const inv of r.invitations) {
      const supplier = w.supplier(inv.supplier);
      const notifiedAt = w.daysAgo(inv.daysAgo);
      invitationRows.push({
        id: rng.id(),
        rfqId,
        supplierCompanyId: supplier.id,
        status: inv.status,
        notifiedAt,
        viewedAt: inv.status === "PENDING" ? null : new Date(notifiedAt.getTime() + rng.int(1, 30) * 3_600_000),
      });
    }

    let quotationCount = 0;
    let awardedQuotationId: string | null = null;
    for (const q of r.quotations) {
      const supplier = w.supplier(q.supplier);
      const quotationId = rng.id();
      const number = quotationNumber();
      const subtotal = round4(q.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
      const total = round4(subtotal + q.shippingCost - q.discount);
      const submittedAt = w.daysAgo(q.submittedDaysAgo);
      const parent = q.revisionOf ? w.quotation(q.revisionOf) : null;
      quotationRows.push({
        id: quotationId,
        quotationNumber: number,
        rfqId,
        supplierCompanyId: supplier.id,
        createdById: supplier.ownerUserId,
        status: q.status,
        revisionNumber: parent ? 2 : 1,
        parentQuotationId: parent?.id ?? null,
        currency: "USD",
        subtotal,
        shippingCost: q.shippingCost,
        discount: q.discount,
        total,
        moq: q.moq,
        leadTimeDays: q.leadTimeDays,
        productionTimeNote: q.productionTimeNote ?? null,
        incoterm: q.incoterm,
        shippingMethod: q.shippingMethod ?? null,
        paymentTerms: q.paymentTerms,
        validUntil: new Date(submittedAt.getTime() + q.validDays * 86_400_000),
        notes: q.notes ?? null,
        sampleAvailable: q.sampleAvailable,
        samplePrice: q.samplePrice ?? null,
        buyerNotes: q.buyerNotes ?? null,
        submittedAt,
        respondedAt: q.respondedDaysAgo !== undefined ? w.daysAgo(q.respondedDaysAgo) : null,
        createdAt: new Date(submittedAt.getTime() - rng.int(2, 20) * 3_600_000),
        updatedAt: q.respondedDaysAgo !== undefined ? w.daysAgo(q.respondedDaysAgo) : submittedAt,
      });
      q.items.forEach((it, i) =>
        quotationItemRows.push({
          id: rng.id(),
          quotationId,
          rfqItemId: rfqItemIds[it.rfqItem] ?? null,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          total: round4(it.quantity * it.unitPrice),
          notes: it.notes ?? null,
          sortOrder: i,
        }),
      );
      if (COUNTED_STATUSES.has(q.status)) quotationCount += 1;
      if (r.awardedQuotation === q.key) awardedQuotationId = quotationId;
      w.quotations.set(q.key, { id: quotationId, key: q.key, number, rfqKey: r.key, supplierSlug: q.supplier, total, currency: "USD", leadTimeDays: q.leadTimeDays });
    }
    if (r.awardedQuotation && !awardedQuotationId) throw new Error(`seed: awarded quotation "${r.awardedQuotation}" not found on rfq ${r.key}`);

    rfqRows.push({
      id: rfqId,
      rfqNumber: number,
      buyerCompanyId: buyer.id,
      createdById: buyer.ownerUserId,
      categoryId: w.category(r.category),
      title: r.title,
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      targetPrice: r.targetPrice ?? null,
      targetCurrency: "USD",
      destinationCountryCode: r.destinationCountryCode,
      destinationCity: r.destinationCity,
      incoterm: r.incoterm,
      preferredPaymentTerms: r.preferredPaymentTerms ?? null,
      quoteDeadline,
      requiredDeliveryDate: w.daysFromNow(r.deliveryDays),
      certificationRequirements: r.certificationRequirements ?? null,
      customizationRequirements: r.customizationRequirements ?? null,
      packagingRequirements: r.packagingRequirements ?? null,
      sampleRequired: !!r.sampleRequired,
      status: r.status,
      visibility: "PUBLIC",
      isPriority: !!r.isPriority,
      viewCount: r.viewCount,
      quotationCount,
      awardedQuotationId,
      publishedAt,
      closedAt,
      expiresAt: publishedAt ? quoteDeadline : null,
      createdAt,
      updatedAt: closedAt ?? (r.quotations.length ? w.daysAgo(Math.min(...r.quotations.map((q) => q.submittedDaysAgo))) : createdAt),
    });
    w.rfqs.set(r.key, { id: rfqId, key: r.key, number, buyerSlug: r.buyer, title: r.title });
  }

  await insertAll(db, rfqs, rfqRows);
  await insertAll(db, rfqItems, itemRows);
  await insertAll(db, rfqInvitations, invitationRows);
  await insertAll(db, quotations, quotationRows);
  await insertAll(db, quotationItems, quotationItemRows);
  console.log(`  rfqs: ${rfqRows.length}, invitations: ${invitationRows.length}, quotations: ${quotationRows.length}`);
}
