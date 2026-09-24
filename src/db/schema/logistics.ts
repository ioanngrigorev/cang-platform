import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money, money2, rating, timestamps } from "./_helpers";
import { companies } from "./companies";
import {
  incotermEnum,
  logisticsQuoteStatusEnum,
  logisticsRequestStatusEnum,
  logisticsServiceEnum,
  shipmentModeEnum,
  shipmentStatusEnum,
} from "./enums";
import { orders, type Address } from "./orders";

export const logisticsProviders = pgTable(
  "logistics_providers",
  {
    id: id(),
    companyId: text()
      .unique()
      .references(() => companies.id),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    logoUrl: text(),
    services: logisticsServiceEnum().array().notNull().default(sql`'{}'::logistics_service[]`),
    modes: shipmentModeEnum().array().notNull().default(sql`'{}'::shipment_mode[]`),
    countries: text().array().notNull().default(emptyTextArray),
    adapterCode: text().notNull().default("manual"),
    apiConfig: jsonb().$type<Record<string, unknown>>(),
    ratingAvg: rating("rating_avg").notNull().default(0),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("logistics_providers_code_idx").on(t.code)],
);

export const logisticsRequests = pgTable(
  "logistics_requests",
  {
    id: id(),
    requestNumber: text().notNull(),
    requesterCompanyId: text()
      .notNull()
      .references(() => companies.id),
    orderId: text().references(() => orders.id),
    status: logisticsRequestStatusEnum().notNull().default("OPEN"),
    services: logisticsServiceEnum().array().notNull().default(sql`'{}'::logistics_service[]`),
    preferredMode: shipmentModeEnum(),
    originAddress: jsonb().$type<Address>().notNull(),
    destinationAddress: jsonb().$type<Address>().notNull(),
    originCountryCode: text().notNull().default("VN"),
    destinationCountryCode: text().notNull(),
    incoterm: incotermEnum(),
    cargoDescription: text(),
    hsCode: text(),
    packages: integer(),
    grossWeightKg: numeric({ precision: 12, scale: 2, mode: "number" }),
    volumeCbm: numeric({ precision: 12, scale: 3, mode: "number" }),
    containerType: text(), // 20GP, 40GP, 40HQ, LCL
    cargoValue: money2("cargo_value"),
    currency: text().notNull().default("USD"),
    insuranceRequired: boolean().notNull().default(false),
    readyDate: timestamp({ withTimezone: true }),
    requiredDeliveryDate: timestamp({ withTimezone: true }),
    notes: text(),
    quoteDeadline: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("logistics_requests_number_idx").on(t.requestNumber),
    index("logistics_requests_requester_idx").on(t.requesterCompanyId, t.status),
    index("logistics_requests_order_idx").on(t.orderId),
  ],
);

export const logisticsQuotes = pgTable(
  "logistics_quotes",
  {
    id: id(),
    requestId: text()
      .notNull()
      .references(() => logisticsRequests.id, { onDelete: "cascade" }),
    providerId: text()
      .notNull()
      .references(() => logisticsProviders.id),
    status: logisticsQuoteStatusEnum().notNull().default("SUBMITTED"),
    currency: text().notNull().default("USD"),
    amount: money("amount").notNull(),
    breakdown: jsonb().$type<Array<{ label: string; amount: number }>>(),
    mode: shipmentModeEnum().notNull(),
    transitDays: integer(),
    validUntil: timestamp({ withTimezone: true }),
    notes: text(),
    ...timestamps(),
  },
  (t) => [index("logistics_quotes_request_idx").on(t.requestId), index("logistics_quotes_provider_idx").on(t.providerId, t.status)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    shipmentNumber: text().notNull(),
    orderId: text()
      .notNull()
      .references(() => orders.id),
    providerId: text().references(() => logisticsProviders.id),
    logisticsQuoteId: text().references(() => logisticsQuotes.id),
    status: shipmentStatusEnum().notNull().default("PENDING"),
    mode: shipmentModeEnum().notNull().default("SEA_FCL"),
    carrier: text(),
    trackingNumber: text(),
    containerNumber: text(),
    vesselOrFlight: text(),
    incoterm: incotermEnum(),
    originAddress: jsonb().$type<Address>(),
    originPort: text(),
    destinationPort: text(),
    destinationAddress: jsonb().$type<Address>(),
    packages: integer(),
    grossWeightKg: numeric({ precision: 12, scale: 2, mode: "number" }),
    volumeCbm: numeric({ precision: 12, scale: 3, mode: "number" }),
    etd: timestamp({ withTimezone: true }),
    eta: timestamp({ withTimezone: true }),
    actualDeparture: timestamp({ withTimezone: true }),
    actualArrival: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    insured: boolean().notNull().default(false),
    insuranceValue: money2("insurance_value"),
    cost: money("cost"),
    currency: text().notNull().default("USD"),
    notes: text(),
    /** Carrier adapter for tracking-number sync / webhooks (GHN, GHTK, VTP, JT, VNPOST, MANUAL…). */
    carrierCode: text(),
    /** When the shipment was handed to its logistics partner (providerId). */
    assignedAt: timestamp({ withTimezone: true }),
    /** Reason code of the current failure / exception status, cleared when the shipment moves on. */
    exceptionReason: text(),
    lastEventAt: timestamp({ withTimezone: true }),
    trackingSyncedAt: timestamp({ withTimezone: true }),
    trackingSyncError: text(),
    /** Proof of delivery. */
    receiverName: text(),
    podUrl: text(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("shipments_number_idx").on(t.shipmentNumber),
    index("shipments_order_idx").on(t.orderId),
    index("shipments_status_idx").on(t.status),
    index("shipments_provider_idx").on(t.providerId, t.status),
    index("shipments_tracking_idx").on(t.carrierCode, t.trackingNumber),
  ],
);

/** Milestones: FACTORY → PICKUP → WAREHOUSE → ORIGIN_PORT → DEPARTED → IN_TRANSIT → DESTINATION_PORT → CUSTOMS → LAST_MILE → DELIVERED */
export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: id(),
    shipmentId: text()
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    milestone: text().notNull(),
    status: shipmentStatusEnum().notNull(),
    location: text(),
    description: text(),
    source: text().notNull().default("manual"), // manual | partner | carrier-sync | webhook | api | system
    /** Failure / exception reason code (see modules/logistics/tracking/statuses.ts). */
    reasonCode: text(),
    /** Photos, proof of delivery, B/L, customs declaration… [{ url, name, kind }]. */
    attachments: jsonb().$type<Array<{ url: string; name: string; kind?: string }>>(),
    /** Extra facts: receiver, measured weight/packages, carrier raw status, vehicle/driver… */
    data: jsonb().$type<Record<string, unknown>>(),
    actorUserId: text(),
    actorCompanyId: text(),
    /** Idempotency key for carrier webhooks / sync (carrier|tracking|status|time). */
    externalKey: text(),
    occurredAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("shipment_events_shipment_idx").on(t.shipmentId, t.occurredAt),
    uniqueIndex("shipment_events_external_idx").on(t.externalKey).where(sql`${t.externalKey} is not null`),
  ],
);
