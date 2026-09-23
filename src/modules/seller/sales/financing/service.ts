import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { financingApplications, financingOffers, orders } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { financingNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { routeApplication } from "@/modules/financing/service";
import { notifyCompany, notifyUser } from "@/modules/notifications/service";
import { FINANCEABLE_ORDER_STATUSES, type SellerFinancingInput } from "./schemas";

/** "1.0% – 1.8% / 30 days" → 1.0 (monthly percent). */
function parseMonthlyRate(indicative: string | null): number {
  const m = indicative?.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1.5;
}

/**
 * Supplier-side counterpart of issueIndicativeOffer: manual-adapter partners publish an indicative offer
 * immediately; the notification links to the supplier dashboard.
 */
async function issueSellerIndicativeOffer(applicationId: string) {
  const app = await db.query.financingApplications.findFirst({ where: eq(financingApplications.id, applicationId), with: { provider: true, offers: true } });
  if (!app?.provider || app.offers.length || app.provider.adapterCode !== "manual") return null;
  const monthly = parseMonthlyRate(app.provider.indicativeRate);
  const tenorDays = Math.min(Math.max(app.requestedTenorDays ?? 90, app.provider.minTenorDays ?? 30), app.provider.maxTenorDays ?? 180);
  const feePercent = 1;
  const feeAmount = Math.round(app.amount * (feePercent / 100) * 100) / 100;
  const [offer] = await db
    .insert(financingOffers)
    .values({
      applicationId: app.id,
      providerId: app.provider.id,
      status: "OFFERED",
      amount: app.amount,
      currency: app.currency,
      interestRate: Math.round(monthly * 12 * 100) / 100,
      feePercent,
      feeAmount,
      tenorDays,
      repaymentSchedule: [{ dueAt: new Date(Date.now() + tenorDays * 86400000).toISOString(), amount: Math.round((app.amount * (1 + (monthly / 100) * (tenorDays / 30)) + feeAmount) * 100) / 100 }],
      terms: `Indicative offer from ${app.provider.name}. Rate ${app.provider.indicativeRate ?? `${monthly}% / month`}, origination fee ${feePercent}%. Subject to the partner's final credit approval and documentation.`,
      validUntil: new Date(Date.now() + 14 * 86400000),
    })
    .returning();
  await db.update(financingApplications).set({ status: "OFFERED" }).where(eq(financingApplications.id, app.id));
  await notifyCompany(app.companyId, {
    type: "FINANCING_UPDATE",
    title: `Indicative offer received for ${app.applicationNumber}`,
    body: `${app.provider.name} · ${app.currency} ${app.amount} over ${tenorDays} days.`,
    link: `/seller/financing/${app.id}`,
  });
  return offer;
}

/** Create a SUBMITTED seller-side application (production / receivables financing), score, route and notify. */
export async function submitSellerFinancingApplication(companyId: string, userId: string, input: SellerFinancingInput) {
  if (input.orderId) {
    const [order] = await db
      .select({ id: orders.id, statusCode: orders.statusCode })
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))
      .limit(1);
    if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
    if (!FINANCEABLE_ORDER_STATUSES.includes(order.statusCode)) throw new ActionError("Financing can only be requested for orders that are confirmed and not yet delivered.", "INVALID_STATE");
  }
  const [app] = await db
    .insert(financingApplications)
    .values({
      applicationNumber: financingNumber(),
      companyId,
      orderId: input.orderId,
      side: "SELLER",
      productType: input.productType,
      status: "SUBMITTED",
      amount: input.amount,
      currency: input.currency,
      purpose: input.purpose,
      requestedTenorDays: input.requestedTenorDays,
      financialData: { declaredBy: userId },
      submittedAt: new Date(),
    })
    .returning();
  await audit({ actorId: userId, action: "financing.apply", entityType: "financingApplication", entityId: app.id, after: { side: "SELLER", amount: app.amount, productType: app.productType } });
  const routing = await routeApplication(app.id);
  if (routing.matched) await issueSellerIndicativeOffer(app.id);
  await notifyUser(userId, {
    type: "FINANCING_UPDATE",
    title: routing.matched ? `Application ${app.applicationNumber} routed to ${routing.providerName}` : `Application ${app.applicationNumber} received`,
    body: routing.matched ? `Credit score ${routing.score} (grade ${routing.grade}).` : routing.reason,
    link: `/seller/financing/${app.id}`,
    email: false,
  });
  return { application: app, routing };
}
