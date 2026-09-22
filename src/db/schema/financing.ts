import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money2, rate, timestamps } from "./_helpers";
import { companies } from "./companies";
import {
  financingOfferStatusEnum,
  financingProductTypeEnum,
  financingProviderTypeEnum,
  financingSideEnum,
  financingStatusEnum,
} from "./enums";
import { orders } from "./orders";

/** Licensed lenders / factoring partners. CANG only originates and routes. */
export const financingProviders = pgTable(
  "financing_providers",
  {
    id: id(),
    code: text().notNull(),
    name: text().notNull(),
    type: financingProviderTypeEnum().notNull(),
    description: text(),
    logoUrl: text(),
    licenseNumber: text(),
    regulator: text(),
    products: financingProductTypeEnum().array().notNull().default(sql`'{}'::financing_product_type[]`),
    countries: text().array().notNull().default(emptyTextArray),
    currencies: text().array().notNull().default(emptyTextArray),
    minAmount: money2("min_amount"),
    maxAmount: money2("max_amount"),
    minTenorDays: integer(),
    maxTenorDays: integer(),
    indicativeRate: text(), // "1.2% – 2.0% / month"
    adapterCode: text().notNull().default("manual"),
    apiConfig: jsonb().$type<Record<string, unknown>>(),
    routingRules: jsonb().$type<Record<string, unknown>>(), // { minCreditScore, allowedIndustries, ... }
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("financing_providers_code_idx").on(t.code)],
);

export const financingApplications = pgTable(
  "financing_applications",
  {
    id: id(),
    applicationNumber: text().notNull(),
    companyId: text()
      .notNull()
      .references(() => companies.id),
    orderId: text().references(() => orders.id),
    side: financingSideEnum().notNull(),
    productType: financingProductTypeEnum().notNull(),
    status: financingStatusEnum().notNull().default("DRAFT"),
    providerId: text().references(() => financingProviders.id),
    amount: money2("amount").notNull(),
    currency: text().notNull().default("USD"),
    purpose: text(),
    requestedTenorDays: integer(),
    financialData: jsonb().$type<Record<string, unknown>>(), // revenue, receivables, bank/accounting data refs
    riskScore: integer(),
    riskGrade: text(),
    riskScoreVersion: text(),
    riskFactors: jsonb().$type<Record<string, unknown>>(),
    acceptedOfferId: text(),
    submittedAt: timestamp({ withTimezone: true }),
    routedAt: timestamp({ withTimezone: true }),
    decidedAt: timestamp({ withTimezone: true }),
    fundedAt: timestamp({ withTimezone: true }),
    repaidAt: timestamp({ withTimezone: true }),
    declineReason: text(),
    notes: text(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("financing_applications_number_idx").on(t.applicationNumber),
    index("financing_applications_company_idx").on(t.companyId, t.status),
    index("financing_applications_order_idx").on(t.orderId),
    index("financing_applications_provider_idx").on(t.providerId, t.status),
  ],
);

export const financingOffers = pgTable(
  "financing_offers",
  {
    id: id(),
    applicationId: text()
      .notNull()
      .references(() => financingApplications.id, { onDelete: "cascade" }),
    providerId: text()
      .notNull()
      .references(() => financingProviders.id),
    status: financingOfferStatusEnum().notNull().default("OFFERED"),
    amount: money2("amount").notNull(),
    currency: text().notNull().default("USD"),
    interestRate: rate("interest_rate"), // % per annum
    feePercent: rate("fee_percent"),
    feeAmount: money2("fee_amount"),
    tenorDays: integer().notNull(),
    repaymentSchedule: jsonb().$type<Array<{ dueAt: string; amount: number }>>(),
    terms: text(),
    validUntil: timestamp({ withTimezone: true }),
    acceptedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("financing_offers_application_idx").on(t.applicationId)],
);

/** Credit-scoring infrastructure: configurable rules + computed snapshots. No lending decision is hard-coded. */
export const creditScoringRules = pgTable(
  "credit_scoring_rules",
  {
    id: id(),
    code: text().notNull(), // TRANSACTION_HISTORY, ORDER_VOLUME, DISPUTE_RATE, COMPANY_AGE ...
    name: text().notNull(),
    description: text(),
    feature: text().notNull(), // feature extractor key
    weight: rate("weight").notNull().default(1),
    config: jsonb().$type<Record<string, unknown>>(), // thresholds, buckets
    version: text().notNull().default("v1"),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [uniqueIndex("credit_scoring_rules_code_idx").on(t.code)],
);

export const creditScores = pgTable(
  "credit_scores",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    score: integer().notNull(),
    grade: text().notNull(), // A / B / C / D
    version: text().notNull(),
    features: jsonb().$type<Record<string, number | string | boolean | null>>().notNull(),
    breakdown: jsonb().$type<Array<{ rule: string; value: unknown; points: number }>>(),
    computedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("credit_scores_company_idx").on(t.companyId, t.computedAt)],
);
