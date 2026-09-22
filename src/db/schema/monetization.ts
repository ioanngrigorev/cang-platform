import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, money, money2, rate, timestamps } from "./_helpers";
import { companies } from "./companies";
import { commissionStatusEnum, feeCalcEnum, feeTypeEnum, planTierEnum, subscriptionStatusEnum } from "./enums";
import { orders } from "./orders";
import { paymentProviders, payments } from "./payments";

export type PlanLimits = {
  maxProducts: number | null;
  maxRfqResponsesPerMonth: number | null;
  analytics: "none" | "basic" | "advanced";
  rfqPriority: boolean;
  searchBoost: number;
  verificationIncluded: boolean;
  teamSeats: number | null;
  apiAccess: boolean;
  featuredSlots: number;
};

export const plans = pgTable(
  "plans",
  {
    id: id(),
    code: text().notNull(), // FREE, PRO, PREMIUM
    tier: planTierEnum().notNull(),
    name: text().notNull(),
    nameVi: text().notNull(),
    description: text(),
    priceMonthly: money2("price_monthly").notNull().default(0),
    priceYearly: money2("price_yearly").notNull().default(0),
    currency: text().notNull().default("USD"),
    features: jsonb().$type<string[]>().notNull(),
    limits: jsonb().$type<PlanLimits>().notNull(),
    isActive: boolean().notNull().default(true),
    isPublic: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("plans_code_idx").on(t.code)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    planId: text()
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum().notNull().default("ACTIVE"),
    billingCycle: text().notNull().default("monthly"), // monthly | yearly
    currentPeriodStart: timestamp({ withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp({ withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    trialEndsAt: timestamp({ withTimezone: true }),
    paymentProviderId: text().references(() => paymentProviders.id),
    externalId: text(),
    cancelledAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("subscriptions_company_idx").on(t.companyId, t.status)],
);

/** Every fee the platform charges is a FeeRule row — never a constant in code. */
export const feeRules = pgTable(
  "fee_rules",
  {
    id: id(),
    code: text().notNull(),
    name: text().notNull(),
    type: feeTypeEnum().notNull(),
    calc: feeCalcEnum().notNull().default("PERCENTAGE"),
    value: rate("value").notNull().default(0), // percent or fixed amount
    tiers: jsonb().$type<Array<{ upTo: number | null; percent?: number; fixed?: number }>>(),
    currency: text().notNull().default("USD"),
    minFee: money("min_fee"),
    maxFee: money("max_fee"),
    planId: text().references(() => plans.id), // rule applies only to this plan (null = all)
    categorySlug: text(), // category-specific commission
    countryCode: text(),
    paidBy: text().notNull().default("SELLER"), // SELLER | BUYER | SPLIT
    priority: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    validFrom: timestamp({ withTimezone: true }),
    validTo: timestamp({ withTimezone: true }),
    description: text(),
    ...timestamps(),
  },
  (t) => [uniqueIndex("fee_rules_code_idx").on(t.code), index("fee_rules_type_active_idx").on(t.type, t.isActive)],
);

/** Ledger of fees actually computed for a company (commission, orchestration fee, ...). */
export const commissions = pgTable(
  "commissions",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id),
    orderId: text().references(() => orders.id),
    paymentId: text().references(() => payments.id),
    feeRuleId: text().references(() => feeRules.id),
    type: feeTypeEnum().notNull(),
    status: commissionStatusEnum().notNull().default("PENDING"),
    currency: text().notNull().default("USD"),
    baseAmount: money("base_amount").notNull(),
    rate: rate("rate"),
    amount: money("amount").notNull(),
    note: text(),
    collectedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("commissions_company_idx").on(t.companyId, t.status), index("commissions_order_idx").on(t.orderId)],
);
