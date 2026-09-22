import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money, rating, timestamps } from "./_helpers";
import { companies } from "./companies";
import { documents } from "./documents";
import { inspectionResultEnum, inspectionStatusEnum, inspectionTypeEnum } from "./enums";
import { orders } from "./orders";

export const inspectionProviders = pgTable(
  "inspection_providers",
  {
    id: id(),
    companyId: text()
      .unique()
      .references(() => companies.id),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    logoUrl: text(),
    services: inspectionTypeEnum().array().notNull().default(sql`'{}'::inspection_type[]`),
    countries: text().array().notNull().default(emptyTextArray),
    adapterCode: text().notNull().default("manual"),
    apiConfig: jsonb().$type<Record<string, unknown>>(),
    ratingAvg: rating("rating_avg").notNull().default(0),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("inspection_providers_code_idx").on(t.code)],
);

export const inspectionOrders = pgTable(
  "inspection_orders",
  {
    id: id(),
    inspectionNumber: text().notNull(),
    orderId: text().references(() => orders.id),
    requesterCompanyId: text()
      .notNull()
      .references(() => companies.id),
    providerId: text().references(() => inspectionProviders.id),
    type: inspectionTypeEnum().notNull(),
    status: inspectionStatusEnum().notNull().default("REQUESTED"),
    result: inspectionResultEnum().notNull().default("PENDING"),
    factoryAddress: text(),
    requestedDate: timestamp({ withTimezone: true }),
    scheduledAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    checklist: jsonb().$type<Array<{ item: string; result?: string; note?: string }>>(),
    findings: text(),
    fee: money("fee"),
    currency: text().notNull().default("USD"),
    reportDocumentId: text().references(() => documents.id),
    notes: text(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("inspection_orders_number_idx").on(t.inspectionNumber),
    index("inspection_orders_order_idx").on(t.orderId),
    index("inspection_orders_requester_idx").on(t.requesterCompanyId, t.status),
  ],
);
