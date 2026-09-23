"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { plans, subscriptions, users } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { notifyUser } from "@/modules/notifications/service";
import { currentSubscription, pendingUpgrade } from "./queries";

const upgradeSchema = z.object({
  planId: z.string().trim().min(1, "Choose a plan"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

const cancelSchema = z.object({ subscriptionId: z.string().trim().min(1) });

function revalidate() {
  revalidatePath("/[locale]/seller/subscription", "page");
}

/**
 * Request a plan change. No payment is processed: a TRIALING subscription row records the request
 * (the enum has no PENDING status) and platform admins are notified to confirm it.
 */
export async function requestUpgradeAction(_prev: ActionResult<{ planCode: string }> | null, formData: FormData): Promise<ActionResult<{ planCode: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.billing.manage", seller: true });
    const parsed = parseInput(upgradeSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    const [plan] = await db.select().from(plans).where(and(eq(plans.id, d.planId), eq(plans.isActive, true))).limit(1);
    if (!plan) throw new ActionError("Plan not found.", "NOT_FOUND");
    const current = await currentSubscription(company.id);
    if (current?.planId === plan.id) throw new ActionError(`You are already on the ${plan.name} plan.`, "INVALID_STATE");

    const now = new Date();
    const periodEnd = new Date(now.getTime() + (d.billingCycle === "yearly" ? 365 : 30) * 86400000);
    const existing = await pendingUpgrade(company.id);
    const values = { planId: plan.id, billingCycle: d.billingCycle, currentPeriodStart: now, currentPeriodEnd: periodEnd, trialEndsAt: periodEnd, cancelAtPeriodEnd: false, externalId: "UPGRADE_REQUEST" };
    const row = existing
      ? (await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id)).returning())[0]
      : (await db.insert(subscriptions).values({ companyId: company.id, status: "TRIALING", ...values }).returning())[0];

    const staff = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.platformRole, ["FINANCE", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
    await Promise.all(
      staff.map((s) =>
        notifyUser(s.id, {
          type: "SYSTEM",
          title: `Plan upgrade requested: ${company.name} → ${plan.name}`,
          body: `${d.billingCycle} billing${d.note ? ` · ${d.note}` : ""}`,
          link: "/admin/plans",
          data: { companyId: company.id, planId: plan.id, subscriptionId: row.id },
          email: false,
        }),
      ),
    );
    await audit({
      actorId: user.id,
      action: "subscription.upgrade.request",
      entityType: "subscription",
      entityId: row.id,
      before: current ? { planId: current.planId } : null,
      after: { planId: plan.id, planCode: plan.code, billingCycle: d.billingCycle },
    });
    revalidate();
    return ok({ planCode: plan.code }, `Upgrade to ${plan.name} requested. Our team will confirm it and send the invoice.`);
  });
}

/** Withdraw a pending upgrade request. */
export async function cancelUpgradeRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.billing.manage", seller: true });
    const parsed = parseInput(cancelSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, parsed.data.subscriptionId), eq(subscriptions.companyId, company.id), eq(subscriptions.status, "TRIALING")))
      .limit(1);
    if (!row) throw new ActionError("Upgrade request not found.", "NOT_FOUND");
    await db.update(subscriptions).set({ status: "CANCELLED", cancelledAt: new Date() }).where(eq(subscriptions.id, row.id));
    await audit({ actorId: user.id, action: "subscription.upgrade.withdraw", entityType: "subscription", entityId: row.id, before: { planId: row.planId } });
    revalidate();
    return ok(undefined, "Upgrade request withdrawn.");
  });
}
