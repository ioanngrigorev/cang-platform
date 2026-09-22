import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money, softDelete, timestamps } from "./_helpers";
import { companies } from "./companies";
import { documents } from "./documents";
import { incotermEnum, invoiceStatusEnum, invoiceTypeEnum } from "./enums";
import { users } from "./identity";
import { products, productVariants } from "./products";
import { quotations, rfqs } from "./rfq";

/** Order lifecycle stages are configurable from Admin (not an enum). */
export const orderStatuses = pgTable("order_statuses", {
  code: text().primaryKey(), // RFQ, QUOTATION, NEGOTIATION, PURCHASE_ORDER, PAYMENT, PRODUCTION, QUALITY_INSPECTION, SHIPPING, DELIVERY, COMPLETED, CANCELLED, DISPUTED
  name: text().notNull(),
  nameVi: text().notNull(),
  description: text(),
  sortOrder: integer().notNull().default(0),
  color: text().notNull().default("gray"),
  isTerminal: boolean().notNull().default(false),
  isCancellable: boolean().notNull().default(true),
  allowedTransitions: text().array().notNull().default(emptyTextArray),
  isActive: boolean().notNull().default(true),
  ...timestamps(),
});

export type Address = {
  company?: string;
  contactName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
};

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNumber: text().notNull(),
    buyerCompanyId: text()
      .notNull()
      .references(() => companies.id),
    supplierCompanyId: text()
      .notNull()
      .references(() => companies.id),
    rfqId: text().references(() => rfqs.id),
    quotationId: text().references(() => quotations.id),
    statusCode: text()
      .notNull()
      .default("PURCHASE_ORDER")
      .references(() => orderStatuses.code),
    currency: text().notNull().default("USD"),
    subtotal: money("subtotal").notNull(),
    shippingCost: money("shipping_cost").notNull().default(0),
    taxAmount: money("tax_amount").notNull().default(0),
    discount: money("discount").notNull().default(0),
    total: money("total").notNull(),
    platformFee: money("platform_fee").notNull().default(0),
    incoterm: incotermEnum(),
    paymentTerms: text(),
    depositPercent: integer(),
    tradeAssuranceEnabled: boolean().notNull().default(false),
    tradeAssuranceTerms: jsonb().$type<Record<string, unknown>>(), // snapshot of protection terms at order time
    expectedProductionDays: integer(),
    expectedShipDate: timestamp({ withTimezone: true }),
    expectedDeliveryDate: timestamp({ withTimezone: true }),
    shippingAddress: jsonb().$type<Address>(),
    billingAddress: jsonb().$type<Address>(),
    buyerNotes: text(),
    supplierNotes: text(),
    internalNotes: text(),
    placedAt: timestamp({ withTimezone: true }),
    confirmedAt: timestamp({ withTimezone: true }),
    shippedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    cancellationReason: text(),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_buyer_status_idx").on(t.buyerCompanyId, t.statusCode),
    index("orders_supplier_status_idx").on(t.supplierCompanyId, t.statusCode),
    index("orders_status_idx").on(t.statusCode),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text().references(() => products.id),
    variantId: text().references(() => productVariants.id),
    description: text().notNull(),
    specifications: jsonb().$type<Record<string, string>>(),
    quantity: integer().notNull(),
    unit: text().notNull().default("pieces"),
    unitPrice: money("unit_price").notNull(),
    total: money("total").notNull(),
    hsCode: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Timeline of everything that happened to an order. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text().notNull(), // STATUS_CHANGE | PAYMENT | SHIPMENT | DOCUMENT | NOTE | INSPECTION | DISPUTE | SYSTEM
    fromStatus: text(),
    toStatus: text(),
    title: text().notNull(),
    description: text(),
    data: jsonb().$type<Record<string, unknown>>(),
    actorId: text().references(() => users.id),
    isVisibleToBuyer: boolean().notNull().default(true),
    isVisibleToSupplier: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    invoiceNumber: text().notNull(),
    orderId: text().references(() => orders.id),
    type: invoiceTypeEnum().notNull().default("COMMERCIAL"),
    issuerCompanyId: text().references(() => companies.id),
    recipientCompanyId: text().references(() => companies.id),
    status: invoiceStatusEnum().notNull().default("DRAFT"),
    currency: text().notNull().default("USD"),
    subtotal: money("subtotal").notNull(),
    taxAmount: money("tax_amount").notNull().default(0),
    total: money("total").notNull(),
    amountPaid: money("amount_paid").notNull().default(0),
    lineItems: jsonb().$type<Array<{ description: string; quantity: number; unitPrice: number; total: number }>>(),
    notes: text(),
    documentId: text().references(() => documents.id),
    issuedAt: timestamp({ withTimezone: true }),
    dueAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
    index("invoices_order_idx").on(t.orderId),
    index("invoices_recipient_idx").on(t.recipientCompanyId, t.status),
    index("invoices_issuer_idx").on(t.issuerCompanyId, t.status),
  ],
);
