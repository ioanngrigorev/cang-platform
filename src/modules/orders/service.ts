import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { orderEvents, orderStatuses, orders, orderItems, quotations, rfqs } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { orderNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { createPaymentSchedule } from "@/modules/payments/service";
import { getSetting } from "@/modules/settings/service";

export type OrderRow = typeof orders.$inferSelect;

/** Default lifecycle (seeded into order_statuses; admins can edit names, colours and transitions). */
export const DEFAULT_ORDER_STATUSES = [
  { code: "PURCHASE_ORDER", name: "Purchase order", nameVi: "Đơn đặt hàng", sortOrder: 10, color: "steel", allowedTransitions: ["PAYMENT", "CANCELLED"] },
  { code: "PAYMENT", name: "Awaiting payment", nameVi: "Chờ thanh toán", sortOrder: 20, color: "warning", allowedTransitions: ["PRODUCTION", "CANCELLED", "DISPUTED"] },
  { code: "PRODUCTION", name: "In production", nameVi: "Đang sản xuất", sortOrder: 30, color: "info", allowedTransitions: ["QUALITY_INSPECTION", "SHIPPING", "DISPUTED", "CANCELLED"] },
  { code: "QUALITY_INSPECTION", name: "Quality inspection", nameVi: "Kiểm định chất lượng", sortOrder: 40, color: "info", allowedTransitions: ["SHIPPING", "PRODUCTION", "DISPUTED"] },
  { code: "SHIPPING", name: "Shipping", nameVi: "Đang vận chuyển", sortOrder: 50, color: "brass", allowedTransitions: ["DELIVERY", "DISPUTED"] },
  { code: "DELIVERY", name: "Delivered", nameVi: "Đã giao hàng", sortOrder: 60, color: "success", allowedTransitions: ["COMPLETED", "DISPUTED"] },
  { code: "COMPLETED", name: "Completed", nameVi: "Hoàn tất", sortOrder: 70, color: "success", isTerminal: true, isCancellable: false, allowedTransitions: [] },
  { code: "DISPUTED", name: "In dispute", nameVi: "Đang tranh chấp", sortOrder: 80, color: "danger", isCancellable: false, allowedTransitions: ["PRODUCTION", "SHIPPING", "DELIVERY", "COMPLETED", "CANCELLED"] },
  { code: "CANCELLED", name: "Cancelled", nameVi: "Đã huỷ", sortOrder: 90, color: "steel", isTerminal: true, isCancellable: false, allowedTransitions: [] },
];

/** Which roles may trigger which transitions (status codes). Admin may do everything. */
export const TRANSITION_ACTORS: Record<string, Array<"BUYER" | "SUPPLIER">> = {
  PAYMENT: ["SUPPLIER"], // supplier confirms PO → awaiting payment
  PRODUCTION: ["SUPPLIER"],
  QUALITY_INSPECTION: ["SUPPLIER", "BUYER"],
  SHIPPING: ["SUPPLIER"],
  DELIVERY: ["BUYER", "SUPPLIER"],
  COMPLETED: ["BUYER"],
  DISPUTED: ["BUYER", "SUPPLIER"],
  CANCELLED: ["BUYER", "SUPPLIER"],
};

/**
 * Create an order from an accepted quotation. Copies quotation items, sets terms, creates payment schedule.
 */
export async function createOrderFromQuotation(input: {
  quotationId: string;
  actorUserId: string;
  buyerCompanyId: string;
  tradeAssurance?: boolean;
  shippingAddress?: OrderRow["shippingAddress"];
  buyerNotes?: string | null;
}) {
  const quotation = await db.query.quotations.findFirst({
    where: eq(quotations.id, input.quotationId),
    with: { items: true, rfq: true },
  });
  if (!quotation) throw new ActionError("Quotation not found.", "NOT_FOUND");
  if (quotation.rfq.buyerCompanyId !== input.buyerCompanyId) throw new ActionError("This quotation does not belong to your RFQ.", "FORBIDDEN");
  if (!["SUBMITTED", "UNDER_REVIEW", "REVISED", "ACCEPTED"].includes(quotation.status)) throw new ActionError("This quotation can no longer be accepted.", "INVALID_STATE");

  const depositPercent = parseDepositPercent(quotation.paymentTerms) ?? (await getSetting("orders.defaultDepositPercent"));
  const tradeAssurance = input.tradeAssurance ?? (await getSetting("tradeAssurance.enabled"));
  const productionDays = quotation.leadTimeDays ?? null;

  const order = await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(orders)
      .values({
        orderNumber: orderNumber(),
        buyerCompanyId: quotation.rfq.buyerCompanyId,
        supplierCompanyId: quotation.supplierCompanyId,
        rfqId: quotation.rfqId,
        quotationId: quotation.id,
        statusCode: "PURCHASE_ORDER",
        currency: quotation.currency,
        subtotal: quotation.subtotal,
        shippingCost: quotation.shippingCost,
        discount: quotation.discount,
        total: quotation.total,
        incoterm: quotation.incoterm,
        paymentTerms: quotation.paymentTerms,
        depositPercent,
        tradeAssuranceEnabled: tradeAssurance,
        tradeAssuranceTerms: tradeAssurance
          ? {
              version: "2026-09",
              coverage: ["on-time shipment", "product quality as agreed", "refund on non-delivery"],
              inspectionWindowDays: await getSetting("tradeAssurance.inspectionWindowDays"),
              fundsHeldBy: "licensed payment partner",
            }
          : null,
        expectedProductionDays: productionDays,
        expectedShipDate: productionDays ? addDays(new Date(), productionDays) : null,
        shippingAddress: input.shippingAddress ?? null,
        buyerNotes: input.buyerNotes ?? null,
        placedAt: new Date(),
      })
      .returning();
    if (quotation.items.length) {
      await tx.insert(orderItems).values(
        quotation.items.map((it, i) => ({
          orderId: o.id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          total: it.total,
          sortOrder: i,
        })),
      );
    }
    await tx.update(quotations).set({ status: "ACCEPTED", respondedAt: new Date() }).where(eq(quotations.id, quotation.id));
    await tx.update(rfqs).set({ status: "AWARDED", awardedQuotationId: quotation.id, closedAt: new Date() }).where(eq(rfqs.id, quotation.rfqId));
    await tx.insert(orderEvents).values({
      orderId: o.id,
      type: "STATUS_CHANGE",
      toStatus: "PURCHASE_ORDER",
      title: "Purchase order placed",
      description: `Order created from quotation ${quotation.quotationNumber}.`,
      actorId: input.actorUserId,
    });
    await createPaymentSchedule(o, tx);
    return o;
  });

  await notifyCompany(quotation.supplierCompanyId, {
    type: "ORDER_CREATED",
    title: `New purchase order ${order.orderNumber}`,
    body: `Your quotation ${quotation.quotationNumber} was accepted. Please confirm the order.`,
    link: `/seller/orders/${order.id}`,
  });
  await audit({ actorId: input.actorUserId, action: "order.create", entityType: "order", entityId: order.id, after: { quotationId: quotation.id, total: order.total } });
  return order;
}

/**
 * Move an order to a new status, enforcing the configurable transition graph and actor rules.
 */
export async function transitionOrder(input: {
  orderId: string;
  toStatus: string;
  actorUserId: string | null;
  actorSide: "BUYER" | "SUPPLIER" | "ADMIN";
  note?: string | null;
  tx?: Tx;
}) {
  const run = async (tx: Tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
    const [current] = await tx.select().from(orderStatuses).where(eq(orderStatuses.code, order.statusCode)).limit(1);
    const [target] = await tx.select().from(orderStatuses).where(eq(orderStatuses.code, input.toStatus)).limit(1);
    if (!target || !target.isActive) throw new ActionError("Unknown order status.", "INVALID_STATE");
    if (input.actorSide !== "ADMIN") {
      if (!current?.allowedTransitions.includes(input.toStatus)) {
        throw new ActionError(`Cannot move an order from "${current?.name ?? order.statusCode}" to "${target.name}".`, "INVALID_TRANSITION");
      }
      const allowedActors = TRANSITION_ACTORS[input.toStatus] ?? [];
      if (!allowedActors.includes(input.actorSide)) throw new ActionError("You are not allowed to perform this step.", "FORBIDDEN");
      if (input.toStatus === "CANCELLED" && !current?.isCancellable) throw new ActionError("This order can no longer be cancelled.", "INVALID_TRANSITION");
    }
    const stamps: Partial<typeof orders.$inferInsert> = {};
    if (input.toStatus === "PAYMENT") stamps.confirmedAt = new Date();
    if (input.toStatus === "SHIPPING") stamps.shippedAt = new Date();
    if (input.toStatus === "DELIVERY") stamps.deliveredAt = new Date();
    if (input.toStatus === "COMPLETED") stamps.completedAt = new Date();
    if (input.toStatus === "CANCELLED") {
      stamps.cancelledAt = new Date();
      stamps.cancellationReason = input.note ?? null;
    }
    const [updated] = await tx
      .update(orders)
      .set({ statusCode: input.toStatus, ...stamps })
      .where(eq(orders.id, order.id))
      .returning();
    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "STATUS_CHANGE",
      fromStatus: order.statusCode,
      toStatus: input.toStatus,
      title: `Status changed to ${target.name}`,
      description: input.note ?? null,
      actorId: input.actorUserId,
    });
    return { order: updated, target, previous: order.statusCode };
  };
  const result = input.tx ? await run(input.tx) : await db.transaction(run);

  const link = (side: "buyer" | "seller") => `/${side}/orders/${result.order.id}`;
  await notifyCompany(result.order.buyerCompanyId, {
    type: "ORDER_STATUS",
    title: `Order ${result.order.orderNumber}: ${result.target.name}`,
    body: input.note ?? undefined,
    link: link("buyer"),
  });
  await notifyCompany(result.order.supplierCompanyId, {
    type: "ORDER_STATUS",
    title: `Order ${result.order.orderNumber}: ${result.target.name}`,
    body: input.note ?? undefined,
    link: link("seller"),
  });
  await audit({
    actorId: input.actorUserId,
    actorType: input.actorSide === "ADMIN" ? "ADMIN" : "USER",
    action: "order.transition",
    entityType: "order",
    entityId: result.order.id,
    before: { status: result.previous },
    after: { status: input.toStatus, note: input.note ?? null },
  });
  return result.order;
}

export async function addOrderNote(orderId: string, actorUserId: string, title: string, description?: string | null, type = "NOTE") {
  await db.insert(orderEvents).values({ orderId, type, title, description: description ?? null, actorId: actorUserId });
}

/** "30% deposit, 70% before shipment" → 30 */
export function parseDepositPercent(terms: string | null | undefined): number | null {
  if (!terms) return null;
  const m = terms.match(/(\d{1,3})\s*%\s*(deposit|advance|upfront|t\/t)/i) ?? terms.match(/^(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n < 100 ? n : null;
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}
