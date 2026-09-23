"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { commissions, feeRules } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { adminActor, revalidateAdmin } from "../context";
import { commissionStatusSchema, feeRuleSchema, feeRuleToggleSchema } from "./schemas";

export async function saveFeeRuleAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.fees.write");
    const parsed = parseInput(feeRuleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    if (d.calc === "TIERED" && !Array.isArray(d.tiers)) throw new ActionError("Tiered rules need a tiers array.", "VALIDATION", { tiers: ["Enter the tiers as a JSON array"] });
    const [dup] = await db
      .select({ id: feeRules.id })
      .from(feeRules)
      .where(d.feeRuleId ? and(eq(feeRules.code, d.code), ne(feeRules.id, d.feeRuleId)) : eq(feeRules.code, d.code))
      .limit(1);
    if (dup) throw new ActionError("A rule with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    const values = {
      code: d.code,
      name: d.name,
      type: d.type,
      calc: d.calc,
      value: d.value,
      tiers: (d.calc === "TIERED" ? d.tiers : null) as typeof feeRules.$inferInsert.tiers,
      currency: d.currency,
      minFee: d.minFee,
      maxFee: d.maxFee,
      planId: d.planId,
      categorySlug: d.categorySlug,
      countryCode: d.countryCode ? d.countryCode.toUpperCase() : null,
      paidBy: d.paidBy,
      priority: d.priority,
      isActive: d.isActive,
      validFrom: d.validFrom,
      validTo: d.validTo,
      description: d.description,
    };
    let before: typeof feeRules.$inferSelect | null = null;
    if (d.feeRuleId) {
      [before] = await db.select().from(feeRules).where(eq(feeRules.id, d.feeRuleId)).limit(1);
      if (!before) throw new ActionError("Fee rule not found.", "NOT_FOUND");
    }
    const [row] = before ? await db.update(feeRules).set(values).where(eq(feeRules.id, before.id)).returning() : await db.insert(feeRules).values(values).returning();
    await log({ action: before ? "admin.fee_rule.update" : "admin.fee_rule.create", entityType: "fee_rule", entityId: row.id, before: before ? { code: before.code, calc: before.calc, value: before.value, isActive: before.isActive } : null, after: { code: row.code, type: row.type, calc: row.calc, value: row.value, isActive: row.isActive } });
    revalidateAdmin("/admin/fees");
    return ok({ id: row.id }, before ? "Fee rule updated." : "Fee rule created.");
  });
}

export async function toggleFeeRuleAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.fees.write");
    const parsed = parseInput(feeRuleToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(feeRules).set({ isActive: active }).where(eq(feeRules.id, parsed.data.feeRuleId)).returning({ id: feeRules.id, code: feeRules.code });
    if (!row) throw new ActionError("Fee rule not found.", "NOT_FOUND");
    await log({ action: "admin.fee_rule.toggle", entityType: "fee_rule", entityId: row.id, after: { code: row.code, isActive: active } });
    revalidateAdmin("/admin/fees");
    return ok(undefined, active ? "Rule activated." : "Rule deactivated.");
  });
}

export async function setCommissionStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.fees.write");
    const parsed = parseInput(commissionStatusSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [before] = await db.select().from(commissions).where(eq(commissions.id, parsed.data.commissionId)).limit(1);
    if (!before) throw new ActionError("Commission not found.", "NOT_FOUND");
    const collected = parsed.data.status === "COLLECTED";
    await db
      .update(commissions)
      .set({ status: parsed.data.status, collectedAt: collected ? new Date() : before.collectedAt, note: parsed.data.note ?? before.note })
      .where(eq(commissions.id, before.id));
    await log({ action: "admin.commission.status", entityType: "commission", entityId: before.id, before: { status: before.status }, after: { status: parsed.data.status, note: parsed.data.note } });
    revalidateAdmin("/admin/fees");
    return ok(undefined, "Commission updated.");
  });
}
