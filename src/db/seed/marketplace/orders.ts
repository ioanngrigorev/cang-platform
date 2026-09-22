/**
 * Step 4 — orders and everything downstream of an order: items, timeline events, payments and
 * transactions, commissions, invoices, documents, shipments with milestones, inspections, the
 * dispute, a logistics request with quotes, financing applications/offers and credit scores.
 */
import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import {
  commissions,
  creditScores,
  disputeMessages,
  disputes,
  documents,
  feeRules,
  financingApplications,
  financingOffers,
  inspectionOrders,
  invoices,
  logisticsQuotes,
  logisticsRequests,
  orderEvents,
  orderItems,
  orders,
  paymentTransactions,
  payments,
  shipmentEvents,
  shipments,
  type Address,
} from "@/db/schema";
import { disputeNumber, financingNumber, inspectionNumber, invoiceNumber, logisticsRequestNumber, orderNumber, paymentNumber, shipmentNumber } from "@/lib/ids";
import { ORDERS, type OrderSeed, type OrderStatusCode } from "../data/scenarios";
import { insertAll, type World } from "./context";
import { addDays, addHours, round2, round4 } from "./rng";

type OrderRow = typeof orders.$inferInsert;
type OrderItemRow = typeof orderItems.$inferInsert;
type EventRow = typeof orderEvents.$inferInsert;
type PaymentRow = typeof payments.$inferInsert;
type TxnRow = typeof paymentTransactions.$inferInsert;
type CommissionRow = typeof commissions.$inferInsert;
type InvoiceRow = typeof invoices.$inferInsert;
type DocumentRow = typeof documents.$inferInsert;
type ShipmentRow = typeof shipments.$inferInsert;
type ShipmentEventRow = typeof shipmentEvents.$inferInsert;
type InspectionRow = typeof inspectionOrders.$inferInsert;
type DisputeRow = typeof disputes.$inferInsert;
type DisputeMessageRow = typeof disputeMessages.$inferInsert;
type LogisticsRequestRow = typeof logisticsRequests.$inferInsert;
type LogisticsQuoteRow = typeof logisticsQuotes.$inferInsert;
type FinancingRow = typeof financingApplications.$inferInsert;
type OfferRow = typeof financingOffers.$inferInsert;
type CreditScoreRow = typeof creditScores.$inferInsert;

const STAGE_INDEX: Record<OrderStatusCode, number> = {
  PURCHASE_ORDER: 0,
  PAYMENT: 1,
  PRODUCTION: 2,
  QUALITY_INSPECTION: 3,
  SHIPPING: 4,
  DELIVERY: 5,
  COMPLETED: 6,
  DISPUTED: 5, // disputed after delivery in this dataset
  CANCELLED: 1, // cancelled after confirmation, before deposit
};
const STATUS_NAME: Record<string, string> = {
  PURCHASE_ORDER: "Purchase order",
  PAYMENT: "Awaiting payment",
  PRODUCTION: "In production",
  QUALITY_INSPECTION: "Quality inspection",
  SHIPPING: "Shipping",
  DELIVERY: "Delivered",
  COMPLETED: "Completed",
  DISPUTED: "In dispute",
  CANCELLED: "Cancelled",
};

type FeeRule = typeof feeRules.$inferSelect;

function computeFee(rule: FeeRule, base: number): { amount: number; rate: number | null } {
  if (rule.calc === "PERCENTAGE") return { amount: round4((base * Number(rule.value)) / 100), rate: Number(rule.value) };
  if (rule.calc === "FIXED") return { amount: Number(rule.value), rate: null };
  let amount = 0;
  let remaining = base;
  let lower = 0;
  for (const tier of rule.tiers ?? []) {
    const upper = tier.upTo ?? Number.POSITIVE_INFINITY;
    const slice = Math.max(0, Math.min(remaining, upper - lower));
    if (slice <= 0) break;
    amount += tier.percent !== undefined ? (slice * tier.percent) / 100 : (tier.fixed ?? 0);
    remaining -= slice;
    lower = upper;
    if (remaining <= 0) break;
  }
  if (rule.minFee != null) amount = Math.max(amount, Number(rule.minFee));
  if (rule.maxFee != null) amount = Math.min(amount, Number(rule.maxFee));
  return { amount: round4(amount), rate: base > 0 ? round4((amount / base) * 100) : null };
}

const TRADE_ASSURANCE_TERMS = {
  version: "2026-09",
  coverage: ["on-time shipment", "product quality as agreed", "refund on non-delivery"],
  inspectionWindowDays: 7,
  fundsHeldBy: "licensed payment partner",
};

const BANK_INSTRUCTIONS = (reference: string, currency: string, amount: number) => ({
  method: "BANK_TRANSFER",
  beneficiaryName: "CANG TRADE ASSURANCE PARTNER (escrow account)",
  bankName: "Partner Bank Vietnam — to be configured",
  accountNumber: "0000-0000-0000",
  swift: "XXXXVNVX",
  currency,
  amount,
  reference,
  note: `Include the reference ${reference} in the transfer description. Funds are matched automatically within 1 business day.`,
});

const CHECKLIST_PASS = [
  { item: "Quantity count vs packing list", result: "PASS", note: "2,800 cartons counted, matches packing list" },
  { item: "Workmanship (AQL 2.5, 200 samples)", result: "PASS", note: "0 critical, 1 minor (lacquer run, replaced)" },
  { item: "Dimensions and finish vs approved sample", result: "PASS" },
  { item: "Assembly hardware and instruction sheet", result: "PASS" },
  { item: "Carton marking, EAN labels and drop test", result: "PASS", note: "ISTA 3A report on file" },
  { item: "Moisture content of solid wood", result: "PASS", note: "8–10 %" },
];
const CHECKLIST_PLANNED = [
  { item: "Quantity count vs packing list" },
  { item: "Workmanship (AQL 2.5)" },
  { item: "Colour and label vs approved sample" },
  { item: "Zipper and strap load test" },
  { item: "Carton marking and polybag EAN" },
];

export async function seedOrders(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const feeRows = await db.select().from(feeRules).where(inArray(feeRules.code, ["COMMISSION_DEFAULT", "PAYMENT_ORCHESTRATION"]));
  const commissionRule = feeRows.find((r) => r.code === "COMMISSION_DEFAULT");
  const orchestrationRule = feeRows.find((r) => r.code === "PAYMENT_ORCHESTRATION");
  if (!commissionRule) throw new Error("seed: fee rule COMMISSION_DEFAULT not found (run seedPlatform first)");
  const partnerBank = w.ref(w.ctx.paymentProviderIds, "PARTNER_BANK_TA", "payment provider");

  const orderRows: OrderRow[] = [];
  const itemRows: OrderItemRow[] = [];
  const eventRows: EventRow[] = [];
  const paymentRows: PaymentRow[] = [];
  const txnRows: TxnRow[] = [];
  const commissionRows: CommissionRow[] = [];
  const invoiceRows: InvoiceRow[] = [];
  const documentRows: DocumentRow[] = [];
  const shipmentRows: ShipmentRow[] = [];
  const shipmentEventRows: ShipmentEventRow[] = [];
  const inspectionRows: InspectionRow[] = [];
  const disputeRows: DisputeRow[] = [];
  const disputeMessageRows: DisputeMessageRow[] = [];

  for (const o of ORDERS) {
    const buyer = w.buyer(o.buyer);
    const supplier = w.supplier(o.supplier);
    const stage = STAGE_INDEX[o.status];
    const reached = (code: OrderStatusCode) => stage >= STAGE_INDEX[code];
    const orderId = rng.id();
    const number = orderNumber();
    const currency = "USD";

    // ---- money
    const subtotal = round4(o.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
    const discount = o.discount ?? 0;
    const total = round4(subtotal + o.shippingCost - discount);
    const platformFee = computeFee(commissionRule, total).amount;

    // ---- timeline
    const placedAt = w.daysAgo(o.placedDaysAgo);
    const confirmedAt = reached("PAYMENT") ? addDays(placedAt, 1) : null;
    const depositInitiatedAt = confirmedAt && (reached("PRODUCTION") || o.status === "PAYMENT") ? addHours(confirmedAt, 30) : null;
    const depositPaidAt = confirmedAt && reached("PRODUCTION") ? addDays(confirmedAt, 2) : null;
    const productionStart = depositPaidAt;
    const balanceAfterBl = /B\/L/i.test(o.paymentTerms);
    const shippedAt = o.shippedDaysAgo !== undefined ? w.daysAgo(o.shippedDaysAgo) : reached("SHIPPING") && productionStart ? addDays(productionStart, o.productionDays + 3) : null;
    const transit = o.shipment?.transitDays ?? 30;
    const deliveredAt = o.deliveredDaysAgo !== undefined ? w.daysAgo(o.deliveredDaysAgo) : reached("DELIVERY") && shippedAt ? addDays(shippedAt, transit) : null;
    const completedAt = o.completedDaysAgo !== undefined ? w.daysAgo(o.completedDaysAgo) : o.status === "COMPLETED" && deliveredAt ? addDays(deliveredAt, 7) : null;
    const cancelledAt = o.status === "CANCELLED" ? (o.cancelledDaysAgo !== undefined ? w.daysAgo(o.cancelledDaysAgo) : addDays(placedAt, 4)) : null;
    const disputeAt = o.status === "DISPUTED" ? w.daysAgo(o.disputeDaysAgo ?? 5) : null;
    const expectedShipDate = addDays(confirmedAt ?? placedAt, o.productionDays + 2);
    const expectedDeliveryDate = addDays(expectedShipDate, transit);
    const qcStart = o.status === "QUALITY_INSPECTION" ? addDays(productionStart ?? placedAt, o.productionDays) : o.inspection?.kind === "COMPLETED_PASS" && shippedAt ? addDays(shippedAt, -6) : null;
    let balancePaidAt: Date | null = null;
    if (o.depositPercent < 100) {
      if (o.status === "QUALITY_INSPECTION" && !balanceAfterBl) balancePaidAt = w.daysAgo(3);
      else if (shippedAt && reached("SHIPPING")) balancePaidAt = balanceAfterBl ? addDays(shippedAt, 2) : addDays(shippedAt, -2);
    } else if (depositPaidAt) {
      balancePaidAt = null;
    }

    const shippingAddress: Address = {
      company: buyer.name,
      contactName: buyer.seed.shipping.contactName,
      phone: buyer.seed.phone,
      line1: buyer.seed.shipping.line1,
      line2: buyer.seed.shipping.line2,
      city: buyer.seed.shipping.city,
      state: buyer.seed.shipping.state,
      postalCode: buyer.seed.shipping.postalCode,
      countryCode: buyer.seed.countryCode,
    };
    const billingAddress: Address = { company: buyer.seed.legalName, line1: buyer.seed.address, city: buyer.seed.city, postalCode: buyer.seed.postalCode, countryCode: buyer.seed.countryCode };
    const rfqRef = o.rfq ? w.rfq(o.rfq) : null;
    const shipmentId = o.shipment && shippedAt && reached("SHIPPING") ? rng.id() : null;
    const quotationRef = o.quotation ? w.quotation(o.quotation) : null;

    orderRows.push({
      id: orderId,
      orderNumber: number,
      buyerCompanyId: buyer.id,
      supplierCompanyId: supplier.id,
      rfqId: rfqRef?.id ?? null,
      quotationId: quotationRef?.id ?? null,
      statusCode: o.status,
      currency,
      subtotal,
      shippingCost: o.shippingCost,
      taxAmount: 0,
      discount,
      total,
      platformFee,
      incoterm: o.incoterm,
      paymentTerms: o.paymentTerms,
      depositPercent: o.depositPercent,
      tradeAssuranceEnabled: o.tradeAssurance,
      tradeAssuranceTerms: o.tradeAssurance ? TRADE_ASSURANCE_TERMS : null,
      expectedProductionDays: o.productionDays,
      expectedShipDate,
      expectedDeliveryDate,
      shippingAddress,
      billingAddress,
      buyerNotes: o.buyerNotes ?? null,
      supplierNotes: o.supplierNotes ?? null,
      placedAt,
      confirmedAt,
      shippedAt: reached("SHIPPING") ? shippedAt : null,
      deliveredAt: reached("DELIVERY") ? deliveredAt : null,
      completedAt,
      cancelledAt,
      cancellationReason: o.cancellationReason ?? null,
      createdAt: placedAt,
      updatedAt: completedAt ?? cancelledAt ?? disputeAt ?? deliveredAt ?? shippedAt ?? balancePaidAt ?? depositPaidAt ?? confirmedAt ?? placedAt,
    });

    o.items.forEach((it, i) =>
      itemRows.push({
        id: rng.id(),
        orderId,
        productId: it.product ? w.product(it.product).id : null,
        description: it.description,
        specifications: it.specifications ?? null,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        total: round4(it.quantity * it.unitPrice),
        hsCode: it.hsCode ?? (it.product ? w.product(it.product).hsCode : null),
        sortOrder: i,
      }),
    );

    const event = (type: string, title: string, at: Date, extra: Partial<EventRow> = {}) =>
      eventRows.push({ id: rng.id(), orderId, type, title, createdAt: at, isVisibleToBuyer: true, isVisibleToSupplier: true, ...extra });

    event("STATUS_CHANGE", "Purchase order placed", placedAt, { toStatus: "PURCHASE_ORDER", description: quotationRef ? `Order created from quotation ${quotationRef.number}.` : "Order placed from the product listing.", actorId: buyer.ownerUserId });

    // ---- documents helper
    const doc = (type: DocumentRow["type"], name: string, file: string, ownerSlug: "buyer" | "supplier", at: Date, extra: Partial<DocumentRow> = {}): string => {
      const id = rng.id();
      const storageKey = `seed/orders/${number}/${file}.pdf`;
      documentRows.push({
        id,
        ownerCompanyId: ownerSlug === "buyer" ? buyer.id : supplier.id,
        uploadedById: ownerSlug === "buyer" ? buyer.ownerUserId : supplier.ownerUserId,
        type,
        name,
        mimeType: "application/pdf",
        sizeBytes: rng.int(80_000, 900_000),
        storageKey,
        url: `/api/files/${storageKey}`,
        visibility: "COUNTERPARTY",
        orderId,
        createdAt: at,
        ...extra,
      });
      return id;
    };
    doc("PURCHASE_ORDER", `Purchase order ${number}.pdf`, "purchase-order", "buyer", placedAt);

    // ---- payments
    type PaymentPlan = { kind: "DEPOSIT" | "BALANCE" | "FULL"; amount: number; label: string; dueAt: Date | null; initiatedAt: Date | null; paidAt: Date | null; released: boolean };
    const plans: PaymentPlan[] = [];
    if (o.depositPercent < 100) {
      const deposit = round2((total * o.depositPercent) / 100);
      plans.push({ kind: "DEPOSIT", amount: deposit, label: `${o.depositPercent}% deposit`, dueAt: addDays(placedAt, 7), initiatedAt: depositInitiatedAt, paidAt: depositPaidAt, released: o.status === "COMPLETED" });
      plans.push({
        kind: "BALANCE",
        amount: round2(total - deposit),
        label: `${100 - o.depositPercent}% balance ${balanceAfterBl ? "against copy of B/L" : o.paymentTerms.includes("before delivery") ? "before delivery" : "before shipment"}`,
        dueAt: balanceAfterBl ? (shippedAt ? addDays(shippedAt, 3) : addDays(expectedShipDate, 3)) : expectedShipDate,
        initiatedAt: balancePaidAt ? addDays(balancePaidAt, -1) : null,
        paidAt: balancePaidAt,
        released: o.status === "COMPLETED",
      });
    } else {
      plans.push({ kind: "FULL", amount: total, label: "Full payment", dueAt: addDays(placedAt, 7), initiatedAt: depositInitiatedAt, paidAt: depositPaidAt, released: o.status === "COMPLETED" });
    }

    const paidAmounts: number[] = [];
    for (const p of plans) {
      const paymentId = rng.id();
      const pNumber = paymentNumber();
      const cancelled = o.status === "CANCELLED";
      const status: PaymentRow["status"] = cancelled ? "CANCELLED" : p.released ? "SETTLED" : p.paidAt ? "PAID" : p.initiatedAt ? "PENDING" : "CREATED";
      const escrowStatus: PaymentRow["escrowStatus"] = !o.tradeAssurance ? "NOT_APPLICABLE" : p.released ? "RELEASED" : p.paidAt ? "HELD" : "PENDING_FUNDING";
      const fee = p.initiatedAt ? round2(p.amount * 0.006) : 0;
      const releasedAt = p.released ? completedAt : null;
      paymentRows.push({
        id: paymentId,
        paymentNumber: pNumber,
        orderId,
        payerCompanyId: buyer.id,
        payeeCompanyId: supplier.id,
        providerId: partnerBank,
        providerReference: p.initiatedAt ? pNumber : null,
        kind: p.kind,
        method: "INTERNATIONAL_WIRE",
        status,
        escrowStatus,
        currency,
        amount: p.amount,
        feeAmount: fee,
        netAmount: p.initiatedAt ? round2(p.amount - fee) : null,
        milestoneLabel: p.label,
        instructions: p.initiatedAt ? BANK_INSTRUCTIONS(pNumber, currency, p.amount) : null,
        dueAt: p.dueAt,
        paidAt: cancelled ? null : p.paidAt,
        settledAt: releasedAt,
        releasedAt,
        metadata: { seed: "demo" },
        createdAt: placedAt,
        updatedAt: releasedAt ?? p.paidAt ?? p.initiatedAt ?? placedAt,
      });
      if (p.initiatedAt && !cancelled) {
        txnRows.push({ id: rng.id(), paymentId, providerId: partnerBank, type: "CHARGE", status: "PENDING", currency, amount: p.amount, providerTxnId: pNumber, rawResponse: BANK_INSTRUCTIONS(pNumber, currency, p.amount), createdAt: p.initiatedAt });
        event("PAYMENT", `Payment initiated: ${p.label}`, p.initiatedAt, { description: `${currency} ${p.amount.toLocaleString("en-US")} via Partner Bank — Trade Assurance Account`, actorId: buyer.ownerUserId });
      }
      if (p.paidAt && !cancelled) {
        paidAmounts.push(p.amount);
        const bankRef = `SWIFT-${rng.int(100000, 999999)}${rng.int(100, 999)}`;
        txnRows.push({ id: rng.id(), paymentId, providerId: partnerBank, type: "CAPTURE", status: "SUCCEEDED", currency, amount: p.amount, providerTxnId: bankRef, rawResponse: { source: "admin", bankReference: bankRef }, createdAt: p.paidAt });
        event("PAYMENT", `Payment received: ${p.label}`, p.paidAt, { description: o.tradeAssurance ? "Funds are held under Trade Assurance until release conditions are met." : `${currency} ${p.amount} confirmed.`, actorId: w.adminUserId });
        const fee1 = computeFee(commissionRule, p.amount);
        commissionRows.push({ id: rng.id(), companyId: supplier.id, orderId, paymentId, feeRuleId: commissionRule.id, type: "TRANSACTION_COMMISSION", status: p.released ? "COLLECTED" : "PENDING", currency, baseAmount: p.amount, rate: fee1.rate, amount: fee1.amount, note: `Commission on ${p.label}`, collectedAt: releasedAt, createdAt: p.paidAt, updatedAt: releasedAt ?? p.paidAt });
        if (orchestrationRule) {
          const fee2 = computeFee(orchestrationRule, p.amount);
          commissionRows.push({ id: rng.id(), companyId: supplier.id, orderId, paymentId, feeRuleId: orchestrationRule.id, type: "PAYMENT_ORCHESTRATION", status: p.released ? "COLLECTED" : "PENDING", currency, baseAmount: p.amount, rate: fee2.rate, amount: fee2.amount, note: `Payment orchestration fee on ${p.label}`, collectedAt: releasedAt, createdAt: p.paidAt, updatedAt: releasedAt ?? p.paidAt });
        }
      }
      if (p.released && releasedAt) {
        txnRows.push({ id: rng.id(), paymentId, providerId: partnerBank, type: "RELEASE", status: "SUCCEEDED", currency, amount: round2(p.amount - fee), providerTxnId: `REL-${pNumber}`, note: "Released after buyer confirmed delivery", createdAt: releasedAt });
        event("PAYMENT", `Funds released to supplier: ${p.label}`, releasedAt, { description: "Buyer confirmed delivery; funds released by the payment partner.", actorId: buyer.ownerUserId });
      }
    }
    const amountPaid = round2(paidAmounts.reduce((a, b) => a + b, 0));

    // ---- status timeline
    if (confirmedAt) {
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.PAYMENT}`, confirmedAt, { fromStatus: "PURCHASE_ORDER", toStatus: "PAYMENT", description: "Supplier confirmed the purchase order.", actorId: supplier.ownerUserId });
      const proformaDoc = doc("PROFORMA_INVOICE", `Proforma invoice ${number}.pdf`, "proforma-invoice", "supplier", addHours(confirmedAt, 2));
      event("DOCUMENT", "Proforma invoice issued", addHours(confirmedAt, 2), { description: `Proforma invoice for ${currency} ${total.toLocaleString("en-US")}.`, actorId: supplier.ownerUserId });
      invoiceRows.push({
        id: rng.id(),
        invoiceNumber: invoiceNumber(),
        orderId,
        type: "PROFORMA",
        issuerCompanyId: supplier.id,
        recipientCompanyId: buyer.id,
        status: o.status === "CANCELLED" ? "CANCELLED" : amountPaid >= total ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "ISSUED",
        currency,
        subtotal,
        taxAmount: 0,
        total,
        amountPaid: o.status === "CANCELLED" ? 0 : amountPaid,
        lineItems: o.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, total: round4(it.quantity * it.unitPrice) })),
        notes: `${o.incoterm} · ${o.paymentTerms}`,
        documentId: proformaDoc,
        issuedAt: confirmedAt,
        dueAt: addDays(confirmedAt, 7),
        paidAt: amountPaid >= total ? balancePaidAt ?? depositPaidAt : null,
        createdAt: confirmedAt,
        updatedAt: balancePaidAt ?? depositPaidAt ?? confirmedAt,
      });
    }
    if (depositPaidAt && reached("PRODUCTION")) {
      const start = addHours(depositPaidAt, 6);
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.PRODUCTION}`, start, { fromStatus: "PAYMENT", toStatus: "PRODUCTION", description: "Deposit received; materials released to production.", actorId: supplier.ownerUserId });
      const note1 = addDays(start, Math.min(7, Math.round(o.productionDays * 0.25)));
      if (note1 <= w.now) event("NOTE", "Production update: materials in and cutting started", note1, { description: "Bulk materials inspected and released; first line running.", actorId: supplier.salesUserId ?? supplier.ownerUserId });
      const note2 = addDays(start, Math.round(o.productionDays * 0.6));
      if (note2 <= w.now) event("NOTE", "Production update: 60% complete", note2, { description: "Sewing/assembly on schedule; packing materials received.", actorId: supplier.salesUserId ?? supplier.ownerUserId });
    }
    if (qcStart && (o.status === "QUALITY_INSPECTION" || o.inspection?.kind === "COMPLETED_PASS")) {
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.QUALITY_INSPECTION}`, qcStart, { fromStatus: "PRODUCTION", toStatus: "QUALITY_INSPECTION", description: "Production complete; goods packed and ready for inspection.", actorId: supplier.ownerUserId });
    }

    // ---- inspection
    if (o.inspection) {
      const providerId = w.ref(w.ctx.inspectionProviderIds, o.inspection.provider, "inspection provider");
      if (o.inspection.kind === "COMPLETED_PASS" && shippedAt) {
        const scheduledAt = addDays(shippedAt, -4);
        const completed = addHours(scheduledAt, 7);
        const reportDoc = doc("INSPECTION_REPORT", `Pre-shipment inspection report ${number}.pdf`, "inspection-report", "buyer", completed);
        inspectionRows.push({
          id: rng.id(),
          inspectionNumber: inspectionNumber(),
          orderId,
          requesterCompanyId: buyer.id,
          providerId,
          type: "PRE_SHIPMENT",
          status: "COMPLETED",
          result: "PASS",
          factoryAddress: supplier.seed.factory.address,
          requestedDate: addDays(shippedAt, -12),
          scheduledAt,
          completedAt: completed,
          checklist: CHECKLIST_PASS,
          findings: "Goods conform to the approved sample and purchase order. One minor cosmetic defect (lacquer run on a chair leg) found in 200 sampled pieces and replaced on site. Packaging and ISTA 3A test documentation verified. Container loading approved.",
          fee: o.inspection.fee,
          currency,
          reportDocumentId: reportDoc,
          notes: "AQL 2.5 general inspection level II.",
          createdAt: addDays(shippedAt, -12),
          updatedAt: completed,
        });
        event("INSPECTION", "Pre-shipment inspection booked", addDays(shippedAt, -12), { description: "Vietnam Quality Control Services, AQL 2.5.", actorId: buyer.ownerUserId });
        event("INSPECTION", "Pre-shipment inspection completed: PASS", completed, { description: "0 critical defects; report uploaded.", actorId: w.adminUserId });
      } else if (o.inspection.kind === "SCHEDULED") {
        const requested = w.daysAgo(3);
        inspectionRows.push({
          id: rng.id(),
          inspectionNumber: inspectionNumber(),
          orderId,
          requesterCompanyId: buyer.id,
          providerId,
          type: "PRE_SHIPMENT",
          status: "SCHEDULED",
          result: "PENDING",
          factoryAddress: supplier.seed.factory.address,
          requestedDate: requested,
          scheduledAt: w.daysFromNow(2),
          checklist: CHECKLIST_PLANNED,
          fee: o.inspection.fee,
          currency,
          notes: "Inspector confirmed; 300 cartons ready in the finished-goods warehouse.",
          createdAt: requested,
          updatedAt: w.daysAgo(1),
        });
        event("INSPECTION", "Pre-shipment inspection scheduled", requested, { description: "Vietnam Quality Control Services will inspect at the factory in Vinh Loc IP.", actorId: buyer.ownerUserId });
      }
    }

    // ---- shipping
    if (shippedAt && reached("SHIPPING")) {
      event("SHIPMENT", "Shipment booked", addDays(shippedAt, -3), { description: o.shipment ? `${o.shipment.carrier}, ${o.shipment.vessel}` : "Booking confirmed with forwarder.", actorId: supplier.ownerUserId });
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.SHIPPING}`, shippedAt, { fromStatus: o.inspection?.kind === "COMPLETED_PASS" ? "QUALITY_INSPECTION" : "PRODUCTION", toStatus: "SHIPPING", description: o.shipment ? `Departed ${o.shipment.originPort} on ${o.shipment.vessel}.` : "Goods handed to the carrier.", actorId: supplier.ownerUserId });
      const commercialDoc = doc("COMMERCIAL_INVOICE", `Commercial invoice ${number}.pdf`, "commercial-invoice", "supplier", addHours(shippedAt, 20));
      doc("PACKING_LIST", `Packing list ${number}.pdf`, "packing-list", "supplier", addHours(shippedAt, 20));
      doc("BILL_OF_LADING", `Bill of lading ${o.shipment?.tracking ?? number}.pdf`, "bill-of-lading", "supplier", addHours(shippedAt, 26), { shipmentId });
      doc("CERTIFICATE_OF_ORIGIN", `Certificate of origin ${number}.pdf`, "certificate-of-origin", "supplier", addDays(shippedAt, 3));
      event("DOCUMENT", "Commercial invoice, packing list and bill of lading uploaded", addHours(shippedAt, 26), { actorId: supplier.ownerUserId });
      invoiceRows.push({
        id: rng.id(),
        invoiceNumber: invoiceNumber(),
        orderId,
        type: "COMMERCIAL",
        issuerCompanyId: supplier.id,
        recipientCompanyId: buyer.id,
        status: amountPaid >= total ? "PAID" : "ISSUED",
        currency,
        subtotal,
        taxAmount: 0,
        total,
        amountPaid,
        lineItems: o.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, total: round4(it.quantity * it.unitPrice) })),
        notes: `${o.incoterm} ${o.shipment?.destinationPort ?? ""} · ${o.paymentTerms}`,
        documentId: commercialDoc,
        issuedAt: shippedAt,
        dueAt: addDays(shippedAt, balanceAfterBl ? 3 : 0),
        paidAt: amountPaid >= total ? balancePaidAt ?? depositPaidAt : null,
        createdAt: shippedAt,
        updatedAt: balancePaidAt ?? shippedAt,
      });
    }
    if (o.shipment && shippedAt && shipmentId) {
      const s = o.shipment;
      const delivered = reached("DELIVERY") && deliveredAt ? deliveredAt : null;
      const status: ShipmentRow["status"] = delivered ? "DELIVERED" : "IN_TRANSIT";
      shipmentRows.push({
        id: shipmentId,
        shipmentNumber: shipmentNumber(),
        orderId,
        providerId: w.ref(w.ctx.logisticsProviderIds, s.provider, "logistics provider"),
        status,
        mode: s.mode,
        carrier: s.carrier,
        trackingNumber: s.tracking,
        containerNumber: s.container,
        vesselOrFlight: s.vessel,
        incoterm: o.incoterm,
        originAddress: { company: supplier.name, line1: supplier.seed.factory.address, city: supplier.seed.city, countryCode: "VN" },
        originPort: s.originPort,
        destinationPort: s.destinationPort,
        destinationAddress: shippingAddress,
        packages: s.packages,
        grossWeightKg: s.grossWeightKg,
        volumeCbm: s.volumeCbm,
        etd: shippedAt,
        eta: addDays(shippedAt, s.transitDays),
        actualDeparture: shippedAt,
        actualArrival: delivered ? addDays(delivered, -3) : null,
        deliveredAt: delivered,
        insured: s.insured,
        insuranceValue: s.insured ? round2(total * 1.1) : null,
        cost: s.cost,
        currency,
        notes: `${s.packages} packages, ${s.grossWeightKg.toLocaleString("en-US")} kg, ${s.volumeCbm} CBM`,
        createdAt: addDays(shippedAt, -3),
        updatedAt: delivered ?? w.daysAgo(1),
      });
      const arrival = delivered ?? addDays(shippedAt, s.transitDays);
      const lcl = s.mode === "SEA_LCL";
      const milestones: Array<[string, ShipmentEventRow["status"], Date, string, string]> = [
        ["FACTORY", "BOOKED", addDays(shippedAt, -3), supplier.seed.city, "Booking confirmed; cargo ready at factory"],
        ["PICKUP", "PICKED_UP", addDays(shippedAt, -2), supplier.seed.city, lcl ? "Cargo collected by forwarder truck" : "Container stuffed and sealed at factory"],
        ["WAREHOUSE", "AT_WAREHOUSE", addHours(shippedAt, -40), s.originPort, "Received at consolidation warehouse (CFS)"],
        ["ORIGIN_PORT", "AT_ORIGIN_PORT", addDays(shippedAt, -1), s.originPort, "Gate-in at port of loading; export customs cleared"],
        ["DEPARTED", "DEPARTED", shippedAt, s.originPort, `Loaded on ${s.vessel}; vessel departed`],
        ["IN_TRANSIT", "IN_TRANSIT", addDays(shippedAt, Math.round(s.transitDays * 0.45)), s.mode === "AIR" ? "In flight" : "Singapore", s.mode === "AIR" ? "In transit" : "Transshipment completed"],
        ["DESTINATION_PORT", "AT_DESTINATION_PORT", addDays(arrival, -3), s.destinationPort, "Vessel arrived; container discharged"],
        ["CUSTOMS", "CUSTOMS_CLEARANCE", addDays(arrival, -2), s.destinationPort, "Import customs clearance in progress"],
        ["LAST_MILE", "OUT_FOR_DELIVERY", addHours(arrival, -7), buyer.seed.shipping.city, "Out for delivery to consignee"],
        ["DELIVERED", "DELIVERED", arrival, buyer.seed.shipping.city, "Delivered and signed for at consignee warehouse"],
      ];
      for (const [milestone, evStatus, at, location, description] of milestones) {
        if (at > w.now) continue;
        if (milestone === "WAREHOUSE" && !lcl) continue;
        if (milestone === "FACTORY" && lcl) continue;
        if (!delivered && ["DESTINATION_PORT", "CUSTOMS", "LAST_MILE", "DELIVERED"].includes(milestone)) continue;
        shipmentEventRows.push({ id: rng.id(), shipmentId, milestone, status: evStatus, location, description, source: milestone === "FACTORY" || milestone === "PICKUP" ? "manual" : "provider-api", occurredAt: at, createdAt: at });
      }
      event("SHIPMENT", `Shipment departed ${s.originPort}`, shippedAt, { description: `${s.carrier} · ${s.vessel} · ETA ${addDays(shippedAt, s.transitDays).toISOString().slice(0, 10)}`, actorId: null });
      if (delivered) event("SHIPMENT", `Shipment delivered in ${buyer.seed.shipping.city}`, delivered, { description: `${s.packages} packages received.`, actorId: null });
    }
    if (deliveredAt && reached("DELIVERY")) {
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.DELIVERY}`, addHours(deliveredAt, 3), { fromStatus: "SHIPPING", toStatus: "DELIVERY", description: "Buyer confirmed receipt of the goods.", actorId: buyer.ownerUserId });
    }
    if (completedAt) {
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.COMPLETED}`, completedAt, { fromStatus: "DELIVERY", toStatus: "COMPLETED", description: "Inspection window closed without issues; order completed by buyer.", actorId: buyer.ownerUserId });
    }
    if (disputeAt && o.dispute) {
      const disputeId = rng.id();
      const dNumber = disputeNumber();
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.DISPUTED}`, disputeAt, { fromStatus: "DELIVERY", toStatus: "DISPUTED", description: o.dispute.title, actorId: buyer.ownerUserId });
      event("DISPUTE", `Dispute opened (${dNumber}): quality`, disputeAt, { description: `Claimed amount ${currency} ${o.dispute.claimedAmount.toLocaleString("en-US")}. Balance payment placed on hold under Trade Assurance.`, actorId: buyer.ownerUserId });
      disputeRows.push({
        id: disputeId,
        disputeNumber: dNumber,
        orderId,
        raisedByCompanyId: buyer.id,
        respondentCompanyId: supplier.id,
        type: "QUALITY",
        status: "UNDER_REVIEW",
        title: o.dispute.title,
        description: o.dispute.description,
        claimedAmount: o.dispute.claimedAmount,
        currency,
        respondBy: w.daysFromNow(o.dispute.respondInDays),
        createdAt: disputeAt,
        updatedAt: w.daysAgo(Math.min(...o.dispute.messages.map((m) => m.daysAgo))),
      });
      for (const m of o.dispute.messages) {
        disputeMessageRows.push({
          id: rng.id(),
          disputeId,
          authorId: m.from === "BUYER" ? buyer.ownerUserId : m.from === "SUPPLIER" ? supplier.ownerUserId : w.adminUserId,
          body: m.body,
          isInternal: !!m.internal,
          createdAt: w.daysAgo(m.daysAgo),
        });
      }
      doc("PHOTO", "HF-QA-2609 Sage leggings QA report.pdf", "qa-report-hf-qa-2609", "buyer", disputeAt, { disputeId });
    }
    if (cancelledAt) {
      event("STATUS_CHANGE", `Status changed to ${STATUS_NAME.CANCELLED}`, cancelledAt, { fromStatus: "PAYMENT", toStatus: "CANCELLED", description: o.cancellationReason ?? null, actorId: buyer.ownerUserId });
    }

    w.orders.set(o.key, { id: orderId, key: o.key, number, buyerSlug: o.buyer, supplierSlug: o.supplier, total, currency, status: o.status, placedAt, shippedAt: reached("SHIPPING") ? shippedAt : null, deliveredAt: reached("DELIVERY") ? deliveredAt : null, completedAt });
  }

  eventRows.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

  await insertAll(db, orders, orderRows);
  await insertAll(db, orderItems, itemRows);
  await insertAll(db, orderEvents, eventRows);
  await insertAll(db, documents, documentRows);
  await insertAll(db, invoices, invoiceRows);
  await insertAll(db, payments, paymentRows);
  await insertAll(db, paymentTransactions, txnRows);
  await insertAll(db, commissions, commissionRows);
  await insertAll(db, shipments, shipmentRows);
  await insertAll(db, shipmentEvents, shipmentEventRows);
  await insertAll(db, inspectionOrders, inspectionRows);
  await insertAll(db, disputes, disputeRows);
  await insertAll(db, disputeMessages, disputeMessageRows);
  w.documentIds.push(...documentRows.map((d) => d.id as string));

  await seedLogisticsAndFinancing(db, w);
  console.log(`  orders: ${orderRows.length}, payments: ${paymentRows.length}, invoices: ${invoiceRows.length}, shipments: ${shipmentRows.length}, documents: ${documentRows.length}, commissions: ${commissionRows.length}`);
}

async function seedLogisticsAndFinancing(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const nordwind = w.buyer("nordwind-outdoor");
  const saigonPack = w.supplier("saigon-pack-manufacturing");
  const trailhead = w.buyer("trailhead-supply-co");

  // ---- logistics request (buyer arranging freight for the backpack programme) + 2 quotes
  const requestId = rng.id();
  const requestedAt = w.daysAgo(4);
  const requestRows: LogisticsRequestRow[] = [
    {
      id: requestId,
      requestNumber: logisticsRequestNumber(),
      requesterCompanyId: nordwind.id,
      orderId: null,
      status: "OPEN",
      services: ["FACTORY_PICKUP", "SEA_FREIGHT", "CUSTOMS_BROKERAGE", "CARGO_INSURANCE"],
      preferredMode: "SEA_FCL",
      originAddress: { company: saigonPack.name, line1: saigonPack.seed.factory.address, city: "Ho Chi Minh City", countryCode: "VN" },
      destinationAddress: { company: nordwind.name, contactName: nordwind.seed.shipping.contactName, line1: nordwind.seed.shipping.line1, line2: nordwind.seed.shipping.line2, city: nordwind.seed.shipping.city, postalCode: nordwind.seed.shipping.postalCode, countryCode: "DE" },
      originCountryCode: "VN",
      destinationCountryCode: "DE",
      incoterm: "FOB",
      cargoDescription: "20,000 hiking backpacks in 1,000 cartons (60 × 45 × 45 cm), 2 × 40HQ, non-hazardous",
      hsCode: "4202.92.10",
      packages: 1000,
      grossWeightKg: 14000,
      volumeCbm: 122,
      containerType: "40HQ",
      cargoValue: 237074,
      currency: "USD",
      insuranceRequired: true,
      readyDate: w.daysFromNow(62),
      requiredDeliveryDate: w.daysFromNow(110),
      notes: "Benchmark for comparing FOB and CIF quotations on RFQ for the SS27 backpack programme. Please quote door delivery to Hamburg-Billbrook including German customs brokerage.",
      quoteDeadline: w.daysFromNow(6),
      createdAt: requestedAt,
      updatedAt: w.daysAgo(1),
    },
  ];
  const quoteRows: LogisticsQuoteRow[] = [
    {
      id: rng.id(),
      requestId,
      providerId: w.ref(w.ctx.logisticsProviderIds, "SAIGON_FREIGHT", "logistics provider"),
      status: "SUBMITTED",
      currency: "USD",
      amount: 6420,
      breakdown: [
        { label: "Factory pickup and trucking to Cat Lai (2 × 40HQ)", amount: 520 },
        { label: "Ocean freight Cat Lai → Hamburg, 2 × 40HQ", amount: 4600 },
        { label: "THC and documentation, origin", amount: 380 },
        { label: "Cargo insurance (110 % of value)", amount: 470 },
        { label: "German customs brokerage and delivery to Billbrook", amount: 450 },
      ],
      mode: "SEA_FCL",
      transitDays: 34,
      validUntil: w.daysFromNow(12),
      notes: "Weekly direct service via Singapore; rates valid for cargo ready dates until end of November.",
      createdAt: w.daysAgo(2),
      updatedAt: w.daysAgo(2),
    },
    {
      id: rng.id(),
      requestId,
      providerId: w.ref(w.ctx.logisticsProviderIds, "NORTHSTAR_LOGISTICS", "logistics provider"),
      status: "SUBMITTED",
      currency: "USD",
      amount: 6950,
      breakdown: [
        { label: "Factory pickup and trucking (2 × 40HQ)", amount: 560 },
        { label: "Ocean freight Cai Mep → Hamburg, 2 × 40HQ", amount: 5100 },
        { label: "Origin THC and documents", amount: 360 },
        { label: "Insurance", amount: 480 },
        { label: "Destination clearance and delivery", amount: 450 },
      ],
      mode: "SEA_FCL",
      transitDays: 31,
      validUntil: w.daysFromNow(10),
      notes: "Direct Cai Mep – Hamburg service, 31 days port to port.",
      createdAt: w.daysAgo(1),
      updatedAt: w.daysAgo(1),
    },
  ];
  await insertAll(db, logisticsRequests, requestRows);
  await insertAll(db, logisticsQuotes, quoteRows);

  // ---- financing
  const vnTradeBank = w.ref(w.ctx.financingProviderIds, "VN_TRADE_BANK", "financing provider");
  const qcOrder = w.order("nordwind-laptop-backpacks-qc");
  const paymentOrder = w.order("trailhead-totes-payment");
  const sellerAppId = rng.id();
  const submitted = w.daysAgo(20);
  const financingRows: FinancingRow[] = [
    {
      id: sellerAppId,
      applicationNumber: financingNumber(),
      companyId: saigonPack.id,
      orderId: qcOrder.id,
      side: "SELLER",
      productType: "PRODUCTION_FINANCING",
      status: "OFFERED",
      providerId: vnTradeBank,
      amount: 35000,
      currency: "USD",
      purpose: "Working capital for fabric and hardware purchases on order " + qcOrder.number + " and the upcoming Nordwind SS27 programme.",
      requestedTenorDays: 90,
      financialData: { revenue12m: 18_400_000, receivables: 2_150_000, completedOrdersOnPlatform: 14, gmv12m: 612_000, bankStatementsUploaded: true },
      riskScore: 78,
      riskGrade: "A",
      riskScoreVersion: "v1",
      riskFactors: { completedOrders: 14, gmv12m: 612000, disputeRate: 0, companyAgeYears: 20, verificationLevel: "AUDITED", onTimePaymentRate: 0.98, onTimeDeliveryRate: 0.96 },
      submittedAt: submitted,
      routedAt: addDays(submitted, 1),
      decidedAt: addDays(submitted, 5),
      notes: "Routed to Vietnam Trade Bank (seller-side production financing, score ≥ 55).",
      createdAt: submitted,
      updatedAt: addDays(submitted, 5),
    },
    {
      id: rng.id(),
      applicationNumber: financingNumber(),
      companyId: trailhead.id,
      orderId: paymentOrder.id,
      side: "BUYER",
      productType: "IMPORT_FINANCING",
      status: "SUBMITTED",
      providerId: null,
      amount: 12530,
      currency: "USD",
      purpose: "Finance the 70 % balance on order " + paymentOrder.number + " (promotional totes for the October race series) over 60 days.",
      requestedTenorDays: 60,
      financialData: { revenue12m: 5_800_000, ordersOnPlatform: 3, gmv12m: 118_000, accountingConnected: false },
      submittedAt: w.daysAgo(3),
      createdAt: w.daysAgo(3),
      updatedAt: w.daysAgo(3),
    },
  ];
  const offerRows: OfferRow[] = [
    {
      id: rng.id(),
      applicationId: sellerAppId,
      providerId: vnTradeBank,
      status: "OFFERED",
      amount: 35000,
      currency: "USD",
      interestRate: 12.0,
      feePercent: 1.0,
      feeAmount: 350,
      tenorDays: 90,
      repaymentSchedule: [
        { dueAt: addDays(submitted, 35).toISOString(), amount: 11900 },
        { dueAt: addDays(submitted, 65).toISOString(), amount: 11900 },
        { dueAt: addDays(submitted, 95).toISOString(), amount: 12250 },
      ],
      terms: "Disbursed in USD to the supplier's export account; repayment from Trade Assurance releases on the linked order; 1 % origination fee deducted at disbursement; 12 % p.a. simple interest; no prepayment penalty.",
      validUntil: w.daysFromNow(10),
      createdAt: addDays(submitted, 5),
      updatedAt: addDays(submitted, 5),
    },
  ];
  await insertAll(db, financingApplications, financingRows);
  await insertAll(db, financingOffers, offerRows);

  // ---- credit scores for 5 suppliers
  const scoreSeeds: Array<[string, number, string, Record<string, number | string | boolean | null>]> = [
    ["saigon-pack-manufacturing", 78, "A", { completedOrders: 14, gmv12m: 612000, disputeRate: 0, companyAgeYears: 20, verificationLevel: "AUDITED", onTimePaymentRate: 0.98, onTimeDeliveryRate: 0.96 }],
    ["bien-hoa-footwear", 81, "A", { completedOrders: 22, gmv12m: 940000, disputeRate: 0.01, companyAgeYears: 25, verificationLevel: "AUDITED", onTimePaymentRate: 0.97, onTimeDeliveryRate: 0.97 }],
    ["bac-ninh-precision-electronics", 76, "A", { completedOrders: 9, gmv12m: 410000, disputeRate: 0, companyAgeYears: 16, verificationLevel: "AUDITED", onTimePaymentRate: 0.99, onTimeDeliveryRate: 0.93 }],
    ["truong-an-wood-furniture", 74, "B", { completedOrders: 11, gmv12m: 1280000, disputeRate: 0.02, companyAgeYears: 22, verificationLevel: "AUDITED", onTimePaymentRate: 0.95, onTimeDeliveryRate: 0.9 }],
    ["da-nang-outdoor-gear", 69, "B", { completedOrders: 6, gmv12m: 240000, disputeRate: 0, companyAgeYears: 14, verificationLevel: "AUDITED", onTimePaymentRate: 0.96, onTimeDeliveryRate: 0.88 }],
  ];
  const creditRows: CreditScoreRow[] = scoreSeeds.map(([slug, score, grade, features]) => ({
    id: rng.id(),
    companyId: w.supplier(slug).id,
    score,
    grade,
    version: "v1",
    features,
    breakdown: [
      { rule: "TRANSACTION_HISTORY", value: features.completedOrders, points: Number(features.completedOrders) >= 20 ? 20 : Number(features.completedOrders) >= 5 ? 14 : 8 },
      { rule: "ORDER_VOLUME", value: features.gmv12m, points: Number(features.gmv12m) >= 500000 ? 15 : Number(features.gmv12m) >= 100000 ? 11 : 6 },
      { rule: "DISPUTE_RATE", value: features.disputeRate, points: Number(features.disputeRate) <= 0.02 ? 15 : 10 },
      { rule: "COMPANY_AGE", value: features.companyAgeYears, points: 10 },
      { rule: "VERIFICATION", value: features.verificationLevel, points: 15 },
      { rule: "PAYMENT_BEHAVIOR", value: features.onTimePaymentRate, points: Number(features.onTimePaymentRate) >= 0.95 ? 15 : 9 },
      { rule: "DELIVERY_PERFORMANCE", value: features.onTimeDeliveryRate, points: Number(features.onTimeDeliveryRate) >= 0.95 ? 10 : 6 },
    ],
    computedAt: w.daysAgo(rng.int(1, 20)),
  }));
  await insertAll(db, creditScores, creditRows);
  console.log(`  logistics requests: 1 (+2 quotes), financing applications: ${financingRows.length}, credit scores: ${creditRows.length}`);
}
