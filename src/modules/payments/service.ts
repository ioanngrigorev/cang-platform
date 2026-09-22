import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { companies, orderEvents, orders, paymentTransactions, payments } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { paymentNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { recordCommission } from "@/modules/fees/engine";
import { notifyCompany } from "@/modules/notifications/service";
import { adapterFor, chooseProvider } from "./registry";

type OrderRow = typeof orders.$inferSelect;

/**
 * Create the payment schedule for an order from its payment terms.
 * Deposit/balance split is derived from `depositPercent` (e.g. 30/70); otherwise a single FULL payment.
 * With trade assurance, payments are routed to an escrow-capable provider and held until release.
 */
export async function createPaymentSchedule(order: OrderRow, tx?: Tx) {
  const executor = tx ?? db;
  const provider = await chooseProvider({ currency: order.currency, escrow: order.tradeAssuranceEnabled });
  const rows: Array<typeof payments.$inferInsert> = [];
  const escrow = order.tradeAssuranceEnabled ? "PENDING_FUNDING" : "NOT_APPLICABLE";
  const method = provider?.supportedMethods[0] ?? "BANK_TRANSFER";
  const base = {
    orderId: order.id,
    payerCompanyId: order.buyerCompanyId,
    payeeCompanyId: order.supplierCompanyId,
    providerId: provider?.id ?? null,
    method,
    currency: order.currency,
    status: "CREATED" as const,
    escrowStatus: escrow as typeof payments.$inferInsert.escrowStatus,
  };
  if (order.depositPercent && order.depositPercent > 0 && order.depositPercent < 100) {
    const deposit = round2((order.total * order.depositPercent) / 100);
    rows.push({ ...base, paymentNumber: paymentNumber(), kind: "DEPOSIT", amount: deposit, milestoneLabel: `${order.depositPercent}% deposit`, dueAt: addDays(new Date(), 7) });
    rows.push({
      ...base,
      paymentNumber: paymentNumber(),
      kind: "BALANCE",
      amount: round2(order.total - deposit),
      milestoneLabel: `${100 - order.depositPercent}% balance before shipment`,
      dueAt: order.expectedShipDate ?? null,
    });
  } else {
    rows.push({ ...base, paymentNumber: paymentNumber(), kind: "FULL", amount: order.total, milestoneLabel: "Full payment", dueAt: addDays(new Date(), 7) });
  }
  const created = await executor.insert(payments).values(rows).returning();
  return created;
}

/** Buyer initiates a payment: adapter produces instructions; status → PENDING. */
export async function initiatePayment(paymentId: string, actorUserId: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true, order: true } });
  if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
  if (!["CREATED", "FAILED"].includes(payment.status)) throw new ActionError("This payment has already been initiated.", "INVALID_STATE");
  const provider = payment.provider ?? (await chooseProvider({ currency: payment.currency, escrow: payment.escrowStatus !== "NOT_APPLICABLE" }));
  if (!provider) throw new ActionError("No payment provider is configured. Contact support.", "NO_PROVIDER");
  const [payer] = await db.select({ name: companies.name, email: companies.email, countryCode: companies.countryCode }).from(companies).where(eq(companies.id, payment.payerCompanyId!));
  const [payee] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, payment.payeeCompanyId!));
  const result = await adapterFor(provider).initiate(
    {
      payment,
      payer: { companyId: payment.payerCompanyId, name: payer?.name ?? "Buyer", email: payer?.email, countryCode: payer?.countryCode },
      payee: { companyId: payment.payeeCompanyId, name: payee?.name ?? "Supplier" },
      description: `${payment.milestoneLabel ?? payment.kind} for order ${payment.order?.orderNumber ?? ""}`,
    },
    provider,
  );
  const fee = provider.feeConfig ? round2((payment.amount * (provider.feeConfig.percent ?? 0)) / 100 + (provider.feeConfig.fixed ?? 0)) : 0;
  const [updated] = await db
    .update(payments)
    .set({
      providerId: provider.id,
      providerReference: result.providerReference ?? payment.providerReference,
      instructions: result.instructions,
      status: result.status,
      feeAmount: fee,
      netAmount: round2(payment.amount - fee),
      ...(result.status === "PAID" ? { paidAt: new Date() } : {}),
    })
    .where(eq(payments.id, payment.id))
    .returning();
  await db.insert(paymentTransactions).values({
    paymentId: payment.id,
    providerId: provider.id,
    type: "CHARGE",
    status: "PENDING",
    currency: payment.currency,
    amount: payment.amount,
    providerTxnId: result.providerReference ?? null,
    rawResponse: result.instructions,
  });
  if (payment.orderId) {
    await db.insert(orderEvents).values({
      orderId: payment.orderId,
      type: "PAYMENT",
      title: `Payment initiated: ${payment.milestoneLabel ?? payment.kind}`,
      description: `${payment.currency} ${payment.amount} via ${provider.name}`,
      actorId: actorUserId,
    });
  }
  await audit({ actorId: actorUserId, action: "payment.initiate", entityType: "payment", entityId: payment.id, after: { provider: provider.code } });
  return { payment: updated, instructions: result.instructions, redirectUrl: result.redirectUrl ?? null };
}

/** Mark a payment as PAID (webhook or finance confirmation). Records commission + notifies + advances escrow. */
export async function confirmPayment(paymentId: string, opts: { actorUserId?: string | null; evidence?: Record<string, unknown>; source: "webhook" | "admin" | "demo" }) {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
    with: { provider: true, order: { with: { items: { limit: 1, with: { product: { with: { category: true } } } }, rfq: { with: { category: true } } } } },
  });
  if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
  if (payment.status === "PAID" || payment.status === "SETTLED") return payment;
  if (!["PENDING", "AUTHORIZED", "CREATED"].includes(payment.status)) throw new ActionError(`Cannot confirm a payment in status ${payment.status}.`, "INVALID_STATE");
  let providerTxnId: string | null = null;
  if (payment.provider) {
    const r = await adapterFor(payment.provider).confirm(payment, payment.provider, opts.evidence);
    providerTxnId = r.providerTxnId ?? null;
  }
  const escrow = payment.escrowStatus === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "HELD";
  await db.transaction(async (tx) => {
    await tx.update(payments).set({ status: "PAID", paidAt: new Date(), escrowStatus: escrow }).where(eq(payments.id, payment.id));
    await tx.insert(paymentTransactions).values({
      paymentId: payment.id,
      providerId: payment.providerId,
      type: "CAPTURE",
      status: "SUCCEEDED",
      currency: payment.currency,
      amount: payment.amount,
      providerTxnId,
      rawResponse: opts.evidence ?? { source: opts.source },
    });
    // Platform commission on the seller side, computed by configurable fee rules.
    if (payment.payeeCompanyId) {
      await recordCommission(
        "TRANSACTION_COMMISSION",
        {
          companyId: payment.payeeCompanyId,
          orderId: payment.orderId,
          paymentId: payment.id,
          currency: payment.currency,
          baseAmount: payment.amount,
          categorySlug: payment.order?.items?.[0]?.product?.category?.slug ?? payment.order?.rfq?.category?.slug ?? null,
        },
        tx,
      );
      await recordCommission(
        "PAYMENT_ORCHESTRATION",
        { companyId: payment.payeeCompanyId, orderId: payment.orderId, paymentId: payment.id, currency: payment.currency, baseAmount: payment.amount },
        tx,
      );
    }
    if (payment.orderId) {
      await tx.insert(orderEvents).values({
        orderId: payment.orderId,
        type: "PAYMENT",
        title: `Payment received: ${payment.milestoneLabel ?? payment.kind}`,
        description: escrow === "HELD" ? "Funds are held under Trade Assurance until release conditions are met." : `${payment.currency} ${payment.amount} confirmed.`,
        actorId: opts.actorUserId ?? null,
      });
    }
  });
  if (payment.payeeCompanyId)
    await notifyCompany(payment.payeeCompanyId, {
      type: "PAYMENT_PAID",
      title: `Payment received for order ${payment.order?.orderNumber ?? ""}`,
      body: `${payment.milestoneLabel ?? payment.kind}: ${payment.currency} ${payment.amount}${escrow === "HELD" ? " (held under Trade Assurance)" : ""}`,
      link: payment.orderId ? `/seller/orders/${payment.orderId}` : undefined,
    });
  if (payment.payerCompanyId)
    await notifyCompany(payment.payerCompanyId, {
      type: "PAYMENT_PAID",
      title: `Your payment was confirmed`,
      body: `${payment.milestoneLabel ?? payment.kind} for order ${payment.order?.orderNumber ?? ""} is confirmed.`,
      link: payment.orderId ? `/buyer/orders/${payment.orderId}` : undefined,
    });
  await audit({ actorId: opts.actorUserId ?? null, actorType: opts.actorUserId ? "ADMIN" : "SYSTEM", action: "payment.confirm", entityType: "payment", entityId: payment.id, after: { source: opts.source } });
  return payment;
}

/** Release escrow-held funds to the supplier (after delivery / inspection acceptance). */
export async function releasePayment(paymentId: string, actorUserId: string | null, reason: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true, order: true } });
  if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
  if (payment.escrowStatus !== "HELD" && payment.escrowStatus !== "PARTIALLY_RELEASED") throw new ActionError("Funds are not held for this payment.", "INVALID_STATE");
  let providerTxnId: string | null = null;
  if (payment.provider) providerTxnId = (await adapterFor(payment.provider).release(payment, payment.provider)).providerTxnId ?? null;
  await db.transaction(async (tx) => {
    await tx.update(payments).set({ escrowStatus: "RELEASED", status: "SETTLED", releasedAt: new Date(), settledAt: new Date() }).where(eq(payments.id, payment.id));
    await tx.insert(paymentTransactions).values({ paymentId: payment.id, providerId: payment.providerId, type: "RELEASE", status: "SUCCEEDED", currency: payment.currency, amount: payment.netAmount ?? payment.amount, providerTxnId, note: reason });
    if (payment.orderId)
      await tx.insert(orderEvents).values({ orderId: payment.orderId, type: "PAYMENT", title: `Funds released to supplier: ${payment.milestoneLabel ?? payment.kind}`, description: reason, actorId: actorUserId });
  });
  if (payment.payeeCompanyId)
    await notifyCompany(payment.payeeCompanyId, { type: "PAYMENT_RELEASED", title: `Funds released for order ${payment.order?.orderNumber ?? ""}`, body: reason, link: payment.orderId ? `/seller/orders/${payment.orderId}` : undefined });
  await audit({ actorId: actorUserId, action: "payment.release", entityType: "payment", entityId: payment.id, after: { reason } });
}

export async function refundPayment(paymentId: string, actorUserId: string | null, amount: number | undefined, reason: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true, order: true } });
  if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
  if (!["PAID", "SETTLED", "DISPUTED"].includes(payment.status)) throw new ActionError("Only paid payments can be refunded.", "INVALID_STATE");
  const refundAmount = amount ?? payment.amount;
  let providerTxnId: string | null = null;
  if (payment.provider) providerTxnId = (await adapterFor(payment.provider).refund(payment, payment.provider, refundAmount, reason)).providerTxnId ?? null;
  await db.transaction(async (tx) => {
    await tx.update(payments).set({ status: "REFUNDED", refundedAt: new Date(), escrowStatus: payment.escrowStatus === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "REFUNDED" }).where(eq(payments.id, payment.id));
    await tx.insert(paymentTransactions).values({ paymentId: payment.id, providerId: payment.providerId, type: "REFUND", status: "SUCCEEDED", currency: payment.currency, amount: refundAmount, providerTxnId, note: reason });
    if (payment.orderId) await tx.insert(orderEvents).values({ orderId: payment.orderId, type: "PAYMENT", title: `Refund issued: ${payment.currency} ${refundAmount}`, description: reason, actorId: actorUserId });
  });
  await audit({ actorId: actorUserId, action: "payment.refund", entityType: "payment", entityId: payment.id, after: { amount: refundAmount, reason } });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}
