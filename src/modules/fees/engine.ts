import { and, eq, isNull, lte, or, gte } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { commissions, feeRules, subscriptions } from "@/db/schema";

export type FeeType = typeof feeRules.$inferSelect.type;
export type FeeRule = typeof feeRules.$inferSelect;

export type FeeContext = {
  companyId: string; // company that pays the fee (usually the seller)
  categorySlug?: string | null;
  countryCode?: string | null;
  planId?: string | null;
};

/**
 * Monetization engine: resolves the applicable FeeRule for a fee type and computes the amount.
 * Nothing is hard-coded — rules are rows in `fee_rules`, editable from Admin.
 * Resolution order: plan-specific > category-specific > country-specific > generic, then priority DESC.
 */
export async function resolveFeeRule(type: FeeType, ctx: FeeContext, tx?: Tx): Promise<FeeRule | null> {
  const executor = tx ?? db;
  const now = new Date();
  let planId = ctx.planId ?? null;
  if (!planId) {
    const [sub] = await executor
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(and(eq(subscriptions.companyId, ctx.companyId), eq(subscriptions.status, "ACTIVE")))
      .limit(1);
    planId = sub?.planId ?? null;
  }
  const rules = await executor
    .select()
    .from(feeRules)
    .where(
      and(
        eq(feeRules.type, type),
        eq(feeRules.isActive, true),
        or(isNull(feeRules.validFrom), lte(feeRules.validFrom, now)),
        or(isNull(feeRules.validTo), gte(feeRules.validTo, now)),
      ),
    );
  const scored = rules
    .filter((r) => (!r.planId || r.planId === planId) && (!r.categorySlug || r.categorySlug === ctx.categorySlug) && (!r.countryCode || r.countryCode === ctx.countryCode))
    .map((r) => ({
      r,
      specificity: (r.planId ? 4 : 0) + (r.categorySlug ? 2 : 0) + (r.countryCode ? 1 : 0),
    }))
    .sort((a, b) => b.specificity - a.specificity || b.r.priority - a.r.priority);
  return scored[0]?.r ?? null;
}

export function computeFee(rule: FeeRule, baseAmount: number): { amount: number; rate: number | null } {
  let amount = 0;
  let rate: number | null = null;
  switch (rule.calc) {
    case "FIXED":
      amount = Number(rule.value);
      break;
    case "PERCENTAGE":
      rate = Number(rule.value);
      amount = (baseAmount * rate) / 100;
      break;
    case "TIERED": {
      // Marginal tiers: [{upTo: 10000, percent: 3}, {upTo: null, percent: 2}]
      let remaining = baseAmount;
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
      rate = baseAmount > 0 ? (amount / baseAmount) * 100 : null;
      break;
    }
  }
  if (rule.minFee != null) amount = Math.max(amount, Number(rule.minFee));
  if (rule.maxFee != null) amount = Math.min(amount, Number(rule.maxFee));
  return { amount: round4(amount), rate };
}

/** Compute and record a commission ledger entry for a base amount. Returns null when no rule applies. */
export async function recordCommission(
  type: FeeType,
  ctx: FeeContext & { orderId?: string | null; paymentId?: string | null; currency: string; baseAmount: number; note?: string },
  tx?: Tx,
) {
  const executor = tx ?? db;
  const rule = await resolveFeeRule(type, ctx, tx);
  if (!rule) return null;
  const { amount, rate } = computeFee(rule, ctx.baseAmount);
  const [row] = await executor
    .insert(commissions)
    .values({
      companyId: ctx.companyId,
      orderId: ctx.orderId ?? null,
      paymentId: ctx.paymentId ?? null,
      feeRuleId: rule.id,
      type,
      status: "PENDING",
      currency: ctx.currency,
      baseAmount: ctx.baseAmount,
      rate,
      amount,
      note: ctx.note ?? null,
    })
    .returning();
  return { commission: row, rule };
}

export async function previewFee(type: FeeType, ctx: FeeContext, baseAmount: number) {
  const rule = await resolveFeeRule(type, ctx);
  if (!rule) return { rule: null, amount: 0, rate: null as number | null };
  return { rule, ...computeFee(rule, baseAmount) };
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
