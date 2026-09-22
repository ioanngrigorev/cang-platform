import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money, timestamps } from "./_helpers";
import { companies } from "./companies";
import {
  disputeStatusEnum,
  disputeTypeEnum,
  escrowStatusEnum,
  paymentKindEnum,
  paymentMethodEnum,
  paymentProviderTypeEnum,
  paymentStatusEnum,
  paymentTxnTypeEnum,
  txnStatusEnum,
} from "./enums";
import { users } from "./identity";
import { invoices, orders } from "./orders";

/**
 * Payment orchestration: CANG never holds client money. Each provider row describes a licensed
 * partner (bank, gateway, escrow partner) and the adapter that talks to it.
 */
export const paymentProviders = pgTable(
  "payment_providers",
  {
    id: id(),
    code: text().notNull(), // MANUAL_BANK_TRANSFER, VN_BANK_TRANSFER, ESCROW_PARTNER_X ...
    name: text().notNull(),
    type: paymentProviderTypeEnum().notNull(),
    description: text(),
    adapterCode: text().notNull().default("manual_bank_transfer"),
    supportedMethods: paymentMethodEnum().array().notNull().default(sql`'{}'::payment_method[]`),
    supportedCurrencies: text().array().notNull().default(emptyTextArray),
    supportedCountries: text().array().notNull().default(emptyTextArray),
    supportsEscrow: boolean().notNull().default(false),
    licenseInfo: text(), // regulator + license number of the partner
    publicConfig: jsonb().$type<Record<string, unknown>>(), // non-secret config (bank details etc.)
    feeConfig: jsonb().$type<{ percent?: number; fixed?: number; currency?: string }>(),
    isActive: boolean().notNull().default(false),
    isDefault: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("payment_providers_code_idx").on(t.code)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    paymentNumber: text().notNull(),
    orderId: text().references(() => orders.id),
    invoiceId: text().references(() => invoices.id),
    payerCompanyId: text().references(() => companies.id),
    payeeCompanyId: text().references(() => companies.id),
    providerId: text().references(() => paymentProviders.id),
    providerReference: text(),
    kind: paymentKindEnum().notNull().default("FULL"),
    method: paymentMethodEnum().notNull().default("BANK_TRANSFER"),
    status: paymentStatusEnum().notNull().default("CREATED"),
    escrowStatus: escrowStatusEnum().notNull().default("NOT_APPLICABLE"),
    currency: text().notNull().default("USD"),
    amount: money("amount").notNull(),
    feeAmount: money("fee_amount").notNull().default(0),
    netAmount: money("net_amount"),
    milestoneLabel: text(), // "30% deposit", "70% balance before shipment"
    instructions: jsonb().$type<Record<string, unknown>>(), // provider-generated payer instructions
    dueAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    settledAt: timestamp({ withTimezone: true }),
    releasedAt: timestamp({ withTimezone: true }),
    refundedAt: timestamp({ withTimezone: true }),
    failureReason: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("payments_number_idx").on(t.paymentNumber),
    index("payments_order_idx").on(t.orderId),
    index("payments_payer_idx").on(t.payerCompanyId, t.status),
    index("payments_payee_idx").on(t.payeeCompanyId, t.status),
    index("payments_status_idx").on(t.status),
  ],
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: id(),
    paymentId: text()
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    providerId: text().references(() => paymentProviders.id),
    type: paymentTxnTypeEnum().notNull(),
    status: txnStatusEnum().notNull().default("PENDING"),
    currency: text().notNull(),
    amount: money("amount").notNull(),
    providerTxnId: text(),
    rawResponse: jsonb().$type<Record<string, unknown>>(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payment_transactions_payment_idx").on(t.paymentId)],
);

export const disputes = pgTable(
  "disputes",
  {
    id: id(),
    disputeNumber: text().notNull(),
    orderId: text()
      .notNull()
      .references(() => orders.id),
    raisedByCompanyId: text()
      .notNull()
      .references(() => companies.id),
    respondentCompanyId: text()
      .notNull()
      .references(() => companies.id),
    type: disputeTypeEnum().notNull(),
    status: disputeStatusEnum().notNull().default("OPEN"),
    title: text().notNull(),
    description: text().notNull(),
    claimedAmount: money("claimed_amount"),
    currency: text().notNull().default("USD"),
    resolution: text(),
    resolutionAmount: money("resolution_amount"),
    resolvedById: text().references(() => users.id),
    respondBy: timestamp({ withTimezone: true }),
    resolvedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("disputes_number_idx").on(t.disputeNumber),
    index("disputes_order_idx").on(t.orderId),
    index("disputes_status_idx").on(t.status),
  ],
);

export const disputeMessages = pgTable(
  "dispute_messages",
  {
    id: id(),
    disputeId: text()
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    isInternal: boolean().notNull().default(false), // admin-only note
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("dispute_messages_dispute_idx").on(t.disputeId, t.createdAt)],
);
