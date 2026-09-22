import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, money, softDelete, timestamps } from "./_helpers";
import { companies } from "./companies";
import {
  incotermEnum,
  quotationStatusEnum,
  rfqInvitationStatusEnum,
  rfqStatusEnum,
  rfqVisibilityEnum,
} from "./enums";
import { users } from "./identity";
import { countries, productCategories } from "./reference";

export const rfqs = pgTable(
  "rfqs",
  {
    id: id(),
    rfqNumber: text().notNull(),
    buyerCompanyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdById: text()
      .notNull()
      .references(() => users.id),
    categoryId: text().references(() => productCategories.id),
    title: text().notNull(),
    description: text().notNull(),
    quantity: integer().notNull(),
    unit: text().notNull().default("pieces"),
    targetPrice: money("target_price"),
    targetCurrency: text().notNull().default("USD"),
    destinationCountryCode: text().references(() => countries.code),
    destinationCity: text(),
    incoterm: incotermEnum(),
    preferredPaymentTerms: text(),
    quoteDeadline: timestamp({ withTimezone: true }),
    requiredDeliveryDate: timestamp({ withTimezone: true }),
    certificationRequirements: text(),
    customizationRequirements: text(),
    packagingRequirements: text(),
    sampleRequired: boolean().notNull().default(false),
    status: rfqStatusEnum().notNull().default("DRAFT"),
    visibility: rfqVisibilityEnum().notNull().default("PUBLIC"),
    isPriority: boolean().notNull().default(false), // RFQ Boost (ad product)
    viewCount: integer().notNull().default(0),
    quotationCount: integer().notNull().default(0),
    awardedQuotationId: text(),
    publishedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("rfqs_number_idx").on(t.rfqNumber),
    index("rfqs_buyer_status_idx").on(t.buyerCompanyId, t.status),
    index("rfqs_status_published_idx").on(t.status, t.publishedAt),
    index("rfqs_category_status_idx").on(t.categoryId, t.status),
  ],
);

export const rfqItems = pgTable(
  "rfq_items",
  {
    id: id(),
    rfqId: text()
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    productName: text().notNull(),
    specifications: text(),
    quantity: integer().notNull(),
    unit: text().notNull().default("pieces"),
    targetPrice: money("target_price"),
    notes: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("rfq_items_rfq_idx").on(t.rfqId)],
);

export const rfqInvitations = pgTable(
  "rfq_invitations",
  {
    id: id(),
    rfqId: text()
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    supplierCompanyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: rfqInvitationStatusEnum().notNull().default("PENDING"),
    notifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    viewedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex("rfq_invitations_unique_idx").on(t.rfqId, t.supplierCompanyId),
    index("rfq_invitations_supplier_idx").on(t.supplierCompanyId, t.status),
  ],
);

export const quotations = pgTable(
  "quotations",
  {
    id: id(),
    quotationNumber: text().notNull(),
    rfqId: text()
      .notNull()
      .references(() => rfqs.id, { onDelete: "cascade" }),
    supplierCompanyId: text()
      .notNull()
      .references(() => companies.id),
    createdById: text()
      .notNull()
      .references(() => users.id),
    status: quotationStatusEnum().notNull().default("DRAFT"),
    revisionNumber: integer().notNull().default(1),
    parentQuotationId: text(),
    currency: text().notNull().default("USD"),
    subtotal: money("subtotal").notNull(),
    shippingCost: money("shipping_cost").notNull().default(0),
    discount: money("discount").notNull().default(0),
    total: money("total").notNull(),
    moq: integer(),
    leadTimeDays: integer(),
    productionTimeNote: text(),
    incoterm: incotermEnum(),
    shippingMethod: text(),
    paymentTerms: text(), // "30% deposit, 70% before shipment"
    validUntil: timestamp({ withTimezone: true }),
    notes: text(),
    sampleAvailable: boolean().notNull().default(false),
    samplePrice: money("sample_price"),
    buyerNotes: text(), // buyer-private notes for comparison
    submittedAt: timestamp({ withTimezone: true }),
    respondedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("quotations_number_idx").on(t.quotationNumber),
    index("quotations_rfq_status_idx").on(t.rfqId, t.status),
    index("quotations_supplier_status_idx").on(t.supplierCompanyId, t.status),
  ],
);

export const quotationItems = pgTable(
  "quotation_items",
  {
    id: id(),
    quotationId: text()
      .notNull()
      .references(() => quotations.id, { onDelete: "cascade" }),
    rfqItemId: text().references(() => rfqItems.id),
    description: text().notNull(),
    quantity: integer().notNull(),
    unit: text().notNull().default("pieces"),
    unitPrice: money("unit_price").notNull(),
    total: money("total").notNull(),
    notes: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("quotation_items_quotation_idx").on(t.quotationId)],
);
