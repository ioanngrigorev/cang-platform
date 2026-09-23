"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { plans, subscriptions, type PlanLimits } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { UPGRADE_REQUEST, planSchema, subscriptionCancelSchema, subscriptionIdSchema } from "./schemas";

const DEFAULT_LIMITS: PlanLimits = { maxProducts: null, maxRfqResponsesPerMonth: null, analytics: "basic", rfqPriority: false, searchBoost: 0, verificationIncluded: false, teamSeats: null, apiAccess: false, featuredSlots: 0 };

export async function savePlanAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.plans.write");
    const parsed = parseInput(planSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    if (d.features !== null && !Array.isArray(d.features)) throw new ActionError("Features must be a JSON array.", "VALIDATION", { features: ["Enter a JSON array of strings"] });
    if (d.limits !== null && (typeof d.limits !== "object" || Array.isArray(d.limits))) throw new ActionError("Limits must be a JSON object.", "VALIDATION", { limits: ["Enter a JSON object"] });
    const [dup] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(d.planId ? and(eq(plans.code, d.code), ne(plans.id, d.planId)) : eq(plans.code, d.code))
      .limit(1);
    if (dup) throw new ActionError("A plan with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    let before: typeof plans.$inferSelect | null = null;
    if (d.planId) {
      [before] = await db.select().from(plans).where(eq(plans.id, d.planId)).limit(1);
      if (!before) throw new ActionError("Plan not found.", "NOT_FOUND");
    }
    const values = {
      code: d.code,
      tier: d.tier,
      name: d.name,
      nameVi: d.nameVi,
      description: d.description,
      priceMonthly: d.priceMonthly,
      priceYearly: d.priceYearly,
      currency: d.currency,
      features: (d.features ?? before?.features ?? []) as string[],
      limits: { ...DEFAULT_LIMITS, ...(before?.limits ?? {}), ...((d.limits as Partial<PlanLimits> | null) ?? {}) },
      isPublic: d.isPublic,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
    };
    const [row] = before ? await db.update(plans).set(values).where(eq(plans.id, before.id)).returning() : await db.insert(plans).values(values).returning();
    await log({ action: before ? "admin.plan.update" : "admin.plan.create", entityType: "plan", entityId: row.id, before: before ? { code: before.code, priceMonthly: before.priceMonthly, priceYearly: before.priceYearly, isActive: before.isActive } : null, after: { code: row.code, priceMonthly: row.priceMonthly, priceYearly: row.priceYearly, isActive: row.isActive, isPublic: row.isPublic } });
    revalidateAdmin("/admin/plans");
    return ok({ id: row.id }, before ? "Plan updated." : "Plan created.");
  });
}

async function loadSubscription(id: string) {
  const s = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id), with: { plan: true, company: { columns: { id: true, name: true, isSeller: true } } } });
  if (!s) throw new ActionError("Subscription not found.", "NOT_FOUND");
  return s;
}

function periodFor(cycle: string, start = new Date()) {
  const end = new Date(start);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export async function approveSubscriptionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.plans.write");
    const parsed = parseInput(subscriptionIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const s = await loadSubscription(parsed.data.subscriptionId);
    if (s.status === "ACTIVE") return ok(undefined, "Subscription is already active.");
    const { start, end } = periodFor(s.billingCycle);
    await db.transaction(async (tx) => {
      // Only one live subscription per company: retire the previous one.
      await tx.update(subscriptions).set({ status: "CANCELLED", cancelledAt: new Date(), cancelAtPeriodEnd: false }).where(and(eq(subscriptions.companyId, s.companyId), eq(subscriptions.status, "ACTIVE"), ne(subscriptions.id, s.id)));
      await tx
        .update(subscriptions)
        .set({ status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, trialEndsAt: null, cancelledAt: null, cancelAtPeriodEnd: false, externalId: s.externalId === UPGRADE_REQUEST ? `SUB-${Date.now().toString(36).toUpperCase()}` : s.externalId })
        .where(eq(subscriptions.id, s.id));
    });
    await log({ action: s.externalId === UPGRADE_REQUEST ? "admin.subscription.approve_upgrade" : "admin.subscription.activate", entityType: "subscription", entityId: s.id, before: { status: s.status }, after: { status: "ACTIVE", plan: s.plan.code, companyId: s.companyId, currentPeriodEnd: end, note: parsed.data.note } });
    await notifyCompany(s.companyId, { type: "SYSTEM", title: `Your ${s.plan.name} plan is now active`, body: parsed.data.note ?? `Your subscription runs until ${end.toISOString().slice(0, 10)}.`, link: s.company.isSeller ? "/seller/subscription" : "/buyer", email: true });
    revalidateAdmin("/admin/plans", `/admin/companies/${s.companyId}`);
    return ok(undefined, "Subscription activated.");
  });
}

export async function cancelSubscriptionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.plans.write");
    const parsed = parseInput(subscriptionCancelSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const s = await loadSubscription(parsed.data.subscriptionId);
    if (s.status === "CANCELLED" || s.status === "EXPIRED") return ok(undefined, "Subscription is already cancelled.");
    const atPeriodEnd = parsed.data.mode === "PERIOD_END" && s.status === "ACTIVE";
    await db
      .update(subscriptions)
      .set(atPeriodEnd ? { cancelAtPeriodEnd: true } : { status: "CANCELLED", cancelledAt: new Date(), cancelAtPeriodEnd: false })
      .where(eq(subscriptions.id, s.id));
    await log({ action: atPeriodEnd ? "admin.subscription.cancel_at_period_end" : "admin.subscription.cancel", entityType: "subscription", entityId: s.id, before: { status: s.status }, after: { status: atPeriodEnd ? s.status : "CANCELLED", cancelAtPeriodEnd: atPeriodEnd, note: parsed.data.note } });
    await notifyCompany(s.companyId, { type: "SYSTEM", title: atPeriodEnd ? `Your ${s.plan.name} plan will end on ${s.currentPeriodEnd.toISOString().slice(0, 10)}` : s.externalId === UPGRADE_REQUEST ? "Your plan upgrade request was declined" : `Your ${s.plan.name} plan was cancelled`, body: parsed.data.note ?? undefined, link: s.company.isSeller ? "/seller/subscription" : "/buyer", email: true });
    revalidateAdmin("/admin/plans", `/admin/companies/${s.companyId}`);
    return ok(undefined, atPeriodEnd ? "Subscription will end at the period end." : "Subscription cancelled.");
  });
}
