import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
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
  const provider = await chooseProvider({ currency: order.currency, escrow: order.tradeAssuranceEnabled }, executor);
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
    const deposit = new Decimal(order.total).mul(order.depositPercent).div(100).toDecimalPlaces(2).toNumber();
    rows.push({ ...base, paymentNumber: paymentNumber(), kind: "DEPOSIT", amount: deposit, milestoneLabel: `${order.depositPercent}% deposit`, dueAt: addDays(new Date(), 7) });
    rows.push({
      ...base,
      paymentNumber: paymentNumber(),
      kind: "BALANCE",
      amount: new Decimal(order.total).minus(deposit).toDecimalPlaces(4).toNumber(),
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
  return db.transaction(async (tx) => {
    await lockPayment(tx, paymentId);
    const payment = await tx.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true, order: true } });
    if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
    if (payment.status === "PENDING") return { payment, instructions: payment.instructions ?? {}, redirectUrl: null };
    if (!["CREATED", "FAILED"].includes(payment.status)) throw new ActionError("This payment has already been initiated.", "INVALID_STATE");
    const provider = await chooseProvider({ providerId: payment.providerId, currency: payment.currency, escrow: payment.escrowStatus !== "NOT_APPLICABLE" }, tx);
    if (!provider) throw new ActionError("No payment provider is configured. Contact support.", "NO_PROVIDER");
    const [payer] = await tx.select({ name: companies.name, email: companies.email, countryCode: companies.countryCode }).from(companies).where(eq(companies.id, payment.payerCompanyId!));
    const [payee] = await tx.select({ name: companies.name }).from(companies).where(eq(companies.id, payment.payeeCompanyId!));
    const result = await adapterFor(provider).initiate(
      {
        payment,
        payer: { companyId: payment.payerCompanyId, name: payer?.name ?? "Buyer", email: payer?.email, countryCode: payer?.countryCode },
        payee: { companyId: payment.payeeCompanyId, name: payee?.name ?? "Supplier" },
        description: `${payment.milestoneLabel ?? payment.kind} for order ${payment.order?.orderNumber ?? ""}`,
      },
      provider,
    );
    const fee = provider.feeConfig ? new Decimal(payment.amount).mul(provider.feeConfig.percent ?? 0).div(100).plus(provider.feeConfig.fixed ?? 0).toDecimalPlaces(2).toNumber() : 0;
    const [updated] = await tx
      .update(payments)
      .set({
        providerId: provider.id,
        providerReference: result.providerReference ?? payment.providerReference,
        instructions: result.instructions,
        status: result.status,
        feeAmount: fee,
        netAmount: new Decimal(payment.amount).minus(fee).toDecimalPlaces(4).toNumber(),
        ...(result.status === "PAID" ? { paidAt: new Date() } : {}),
      })
      .where(eq(payments.id, payment.id))
      .returning();
    await tx.insert(paymentTransactions).values({
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
      await tx.insert(orderEvents).values({
        orderId: payment.orderId,
        type: "PAYMENT",
        title: `Payment initiated: ${payment.milestoneLabel ?? payment.kind}`,
        description: `${payment.currency} ${payment.amount} via ${provider.name}`,
        actorId: actorUserId,
      });
    }
    await audit({ actorId: actorUserId, action: "payment.initiate", entityType: "payment", entityId: payment.id, after: { provider: provider.code } }, tx);
    return { payment: updated, instructions: result.instructions, redirectUrl: result.redirectUrl ?? null };
  });
}

/** Mark a payment as PAID (webhook or finance confirmation). Records commission + notifies + advances escrow. */
export async function confirmPayment(paymentId: string, opts: { actorUserId?: string | null; evidence?: Record<string, unknown>; source: "webhook" | "admin" | "demo" }) {
  const { payment, changed } = await db.transaction(async (tx) => {
    await lockPayment(tx, paymentId);
    const payment = await tx.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: { provider: true, order: { with: { items: { limit: 1, with: { product: { with: { category: true } } } }, rfq: { with: { category: true } } } } },
    });
    if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
    if (payment.status === "PAID" || payment.status === "SETTLED") return { payment, changed: false };
    if (!["PENDING", "AUTHORIZED", "CREATED"].includes(payment.status)) throw new ActionError(`Cannot confirm a payment in status ${payment.status}.`, "INVALID_STATE");
    let providerTxnId: string | null = null;
    if (payment.provider) {
      const r = await adapterFor(payment.provider).confirm(payment, payment.provider, opts.evidence);
      providerTxnId = r.providerTxnId ?? null;
    }
    const escrow = payment.escrowStatus === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "HELD";
    const paidAt = new Date();
    await tx.transaction(async (tx) => {
      await tx.update(payments).set({ status: "PAID", paidAt, escrowStatus: escrow }).where(eq(payments.id, payment.id));
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
    await audit({ actorId: opts.actorUserId ?? null, actorType: opts.actorUserId ? "ADMIN" : "SYSTEM", action: "payment.confirm", entityType: "payment", entityId: payment.id, after: { source: opts.source } }, tx);
    return { payment: { ...payment, status: "PAID" as const, escrowStatus: escrow, paidAt }, changed: true };
  });
  if (!changed) return payment;
  const escrow = payment.escrowStatus === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "HELD";
  if (payment.payeeCompanyId)
    await notifyCompany(payment.payeeCompanyId, {
      type: "PAYMENT_PAID",
      title: `Payment received for order ${payment.order?.orderNumber ?? ""}`,
      translations: { vi: { title: `Đã nhận thanh toán cho đơn hàng ${payment.order?.orderNumber ?? ""}`, body: `Số tiền: ${payment.currency} ${payment.amount}.` } },
      body: `${payment.milestoneLabel ?? payment.kind}: ${payment.currency} ${payment.amount}${escrow === "HELD" ? " (held under Trade Assurance)" : ""}`,
      link: payment.orderId ? `/seller/orders/${payment.orderId}` : undefined,
    });
  if (payment.payerCompanyId)
    await notifyCompany(payment.payerCompanyId, {
      type: "PAYMENT_PAID",
      title: `Your payment was confirmed`,
      translations: { vi: { title: "Thanh toán của bạn đã được xác nhận", body: `Thanh toán cho đơn hàng ${payment.order?.orderNumber ?? ""} đã được xác nhận.` } },
      body: `${payment.milestoneLabel ?? payment.kind} for order ${payment.order?.orderNumber ?? ""} is confirmed.`,
      link: payment.orderId ? `/buyer/orders/${payment.orderId}` : undefined,
    });
  return { ...payment, status: "PAID" as const };
}

/** Manual settlement is serialized with confirmations and refunds. Real gateway adapters must
 * additionally use provider-side idempotency keys (a DB transaction cannot roll back a bank call). */
export async function releasePayment(paymentId: string, actorUserId: string | null, reason: string) {
  const payment = await db.transaction(async (tx) => {
    await lockPayment(tx, paymentId);
    const payment = await tx.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true, order: true } });
    if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
    if (payment.escrowStatus === "RELEASED") return null;
    if (!["PAID", "SETTLED"].includes(payment.status) || !["HELD", "PARTIALLY_RELEASED"].includes(payment.escrowStatus))
      throw new ActionError("Funds are not available for release.", "INVALID_STATE");
    const refunded = await transactionTotal(tx, payment.id, "REFUND");
    const released = await transactionTotal(tx, payment.id, "RELEASE");
    const amount = new Decimal(payment.netAmount ?? payment.amount).minus(refunded).minus(released);
    if (amount.lte(0)) throw new ActionError("No funds remain to release.", "INVALID_STATE");
    const providerTxnId = payment.provider ? (await adapterFor(payment.provider).release(payment, payment.provider, amount.toNumber())).providerTxnId ?? null : null;
    await tx.update(payments).set({ escrowStatus: "RELEASED", status: "SETTLED", releasedAt: new Date(), settledAt: new Date() }).where(eq(payments.id, payment.id));
    await tx.insert(paymentTransactions).values({ paymentId: payment.id, providerId: payment.providerId, type: "RELEASE", status: "SUCCEEDED", currency: payment.currency, amount: amount.toNumber(), providerTxnId, note: reason });
    if (payment.orderId) await tx.insert(orderEvents).values({ orderId: payment.orderId, type: "PAYMENT", title: `Funds released to supplier: ${payment.milestoneLabel ?? payment.kind}`, description: reason, actorId: actorUserId });
    await audit({ actorId: actorUserId, action: "payment.release", entityType: "payment", entityId: payment.id, after: { reason, amount: amount.toNumber() } }, tx);
    return payment;
  });
  if (payment?.payeeCompanyId) await notifyCompany(payment.payeeCompanyId, { type: "PAYMENT_RELEASED", title: `Funds released for order ${payment.order?.orderNumber ?? ""}`, translations: { vi: { title: `Đã giải ngân cho đơn hàng ${payment.order?.orderNumber ?? ""}`, body: reason } }, body: reason, link: payment.orderId ? `/seller/orders/${payment.orderId}` : undefined });
}

export async function refundPayment(paymentId: string, actorUserId: string | null, amount: number | undefined, reason: string) {
  return db.transaction(async (tx) => {
    await lockPayment(tx, paymentId);
    const payment = await tx.query.payments.findFirst({ where: eq(payments.id, paymentId), with: { provider: true } });
    if (!payment) throw new ActionError("Payment not found.", "NOT_FOUND");
    if (!["PAID", "SETTLED", "DISPUTED"].includes(payment.status)) throw new ActionError("Only paid payments can be refunded.", "INVALID_STATE");
    const alreadyRefunded = await transactionTotal(tx, payment.id, "REFUND");
    const remaining = new Decimal(payment.amount).minus(alreadyRefunded);
    const refund = new Decimal(amount ?? remaining);
    if (!refund.isFinite() || refund.lte(0) || refund.gt(remaining) || refund.decimalPlaces() > 4)
      throw new ActionError("Refund must be positive and no greater than the remaining paid amount (up to 4 decimals).", "INVALID_AMOUNT");
    const providerTxnId = payment.provider ? (await adapterFor(payment.provider).refund(payment, payment.provider, refund.toNumber(), reason)).providerTxnId ?? null : null;
    const full = refund.eq(remaining);
    await tx.update(payments).set({
      ...(full ? { status: "REFUNDED" as const, escrowStatus: payment.escrowStatus === "NOT_APPLICABLE" ? "NOT_APPLICABLE" as const : "REFUNDED" as const } : {}),
      refundedAt: new Date(),
      metadata: { ...payment.metadata, refundedAmount: alreadyRefunded.plus(refund).toNumber() },
    }).where(eq(payments.id, payment.id));
    await tx.insert(paymentTransactions).values({ paymentId: payment.id, providerId: payment.providerId, type: "REFUND", status: "SUCCEEDED", currency: payment.currency, amount: refund.toNumber(), providerTxnId, note: reason });
    if (payment.orderId) await tx.insert(orderEvents).values({ orderId: payment.orderId, type: "PAYMENT", title: `${full ? "Full" : "Partial"} refund recorded: ${payment.currency} ${refund}`, description: reason, actorId: actorUserId });
    await audit({ actorId: actorUserId, action: "payment.refund", entityType: "payment", entityId: payment.id, after: { amount: refund.toNumber(), reason, full } }, tx);
  });
}

async function lockPayment(tx: Tx, paymentId: string) {
  const [row] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId)).for("update");
  if (!row) throw new ActionError("Payment not found.", "NOT_FOUND");
}

async function transactionTotal(tx: Tx, paymentId: string, type: "REFUND" | "RELEASE") {
  const rows = await tx.select({ amount: paymentTransactions.amount }).from(paymentTransactions).where(and(eq(paymentTransactions.paymentId, paymentId), eq(paymentTransactions.type, type), eq(paymentTransactions.status, "SUCCEEDED")));
  return rows.reduce((sum, row) => sum.plus(row.amount), new Decimal(0));
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}
