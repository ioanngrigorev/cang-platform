import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, money2, timestamps } from "./_helpers";
import { companies } from "./companies";
import {
  analyticsEventTypeEnum,
  apiKeyStatusEnum,
  auditActorTypeEnum,
  bannerPlacementEnum,
  notificationChannelEnum,
  pageStatusEnum,
  pageTypeEnum,
} from "./enums";
import { users } from "./identity";
import { products } from "./products";

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(), // RFQ_NEW_QUOTATION, ORDER_STATUS, MESSAGE, PAYMENT, VERIFICATION, SYSTEM ...
    channel: notificationChannelEnum().notNull().default("IN_APP"),
    title: text().notNull(),
    body: text(),
    link: text(),
    data: jsonb().$type<Record<string, unknown>>(),
    readAt: timestamp({ withTimezone: true }),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: text().references(() => users.id),
    actorType: auditActorTypeEnum().notNull().default("USER"),
    action: text().notNull(), // "product.publish", "admin.company.verify"
    entityType: text().notNull(),
    entityId: text(),
    before: jsonb().$type<Record<string, unknown>>(),
    after: jsonb().$type<Record<string, unknown>>(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    type: analyticsEventTypeEnum().notNull(),
    userId: text().references(() => users.id),
    companyId: text().references(() => companies.id), // supplier that "owns" the viewed entity
    productId: text().references(() => products.id),
    sessionId: text(),
    path: text(),
    referrer: text(),
    countryCode: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("analytics_events_type_idx").on(t.type, t.createdAt),
    index("analytics_events_company_idx").on(t.companyId, t.type, t.createdAt),
    index("analytics_events_product_idx").on(t.productId, t.type, t.createdAt),
  ],
);

/** Pre-aggregated supplier metrics for dashboards (rolled up from analytics events & transactions). */
export const supplierDailyMetrics = pgTable(
  "supplier_daily_metrics",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    date: date().notNull(),
    views: integer().notNull().default(0),
    productViews: integer().notNull().default(0),
    leads: integer().notNull().default(0),
    rfqsReceived: integer().notNull().default(0),
    quotations: integer().notNull().default(0),
    orders: integer().notNull().default(0),
    gmvUsd: money2("gmv_usd").notNull().default(0),
    adImpressions: integer().notNull().default(0),
    adClicks: integer().notNull().default(0),
    adSpendUsd: money2("ad_spend_usd").notNull().default(0),
  },
  (t) => [uniqueIndex("supplier_daily_metrics_unique_idx").on(t.companyId, t.date)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdById: text()
      .notNull()
      .references(() => users.id),
    name: text().notNull(),
    prefix: text().notNull(),
    keyHash: text().notNull(),
    scopes: text().array().notNull().default(emptyTextArray),
    status: apiKeyStatusEnum().notNull().default("ACTIVE"),
    lastUsedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash), index("api_keys_company_idx").on(t.companyId)],
);

// ---- CMS ----

export const pages = pgTable(
  "pages",
  {
    id: id(),
    slug: text().notNull(),
    locale: text().notNull().default("en"),
    type: pageTypeEnum().notNull().default("PAGE"),
    title: text().notNull(),
    excerpt: text(),
    content: text().notNull(), // markdown
    coverImageUrl: text(),
    status: pageStatusEnum().notNull().default("DRAFT"),
    seoTitle: text(),
    seoDescription: text(),
    sortOrder: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("pages_slug_locale_idx").on(t.slug, t.locale), index("pages_type_status_idx").on(t.type, t.status)],
);

export const banners = pgTable(
  "banners",
  {
    id: id(),
    placement: bannerPlacementEnum().notNull(),
    locale: text(), // null = all locales
    title: text().notNull(),
    subtitle: text(),
    imageUrl: text(),
    ctaLabel: text(),
    ctaUrl: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    startAt: timestamp({ withTimezone: true }),
    endAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("banners_placement_idx").on(t.placement, t.isActive)],
);

/** Homepage composition controlled by admin. */
export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: id(),
    key: text().notNull(), // TOP_CATEGORIES, VERIFIED_MANUFACTURERS, MADE_IN_VIETNAM, TRENDING_PRODUCTS, NEW_SUPPLIERS, POST_RFQ, WHY_VIETNAM, TRADE_ASSURANCE, LOGISTICS, FINANCING, GUIDES
    title: text().notNull(),
    titleVi: text().notNull(),
    subtitle: text(),
    subtitleVi: text(),
    config: jsonb().$type<Record<string, unknown>>(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("homepage_sections_key_idx").on(t.key)],
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: id(),
    code: text().notNull(),
    locale: text().notNull().default("en"),
    subject: text().notNull(),
    bodyHtml: text().notNull(),
    bodyText: text(),
    variables: text().array().notNull().default(emptyTextArray),
    isActive: boolean().notNull().default(true),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("email_templates_code_locale_idx").on(t.code, t.locale)],
);

export const settings = pgTable("settings", {
  key: text().primaryKey(),
  group: text().notNull().default("general"), // general | seo | payments | rfq | search | notifications | compliance
  value: jsonb().$type<unknown>().notNull(),
  description: text(),
  isPublic: boolean().notNull().default(false), // safe to expose to the client
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    ticketNumber: text().notNull(),
    requesterId: text()
      .notNull()
      .references(() => users.id),
    companyId: text().references(() => companies.id),
    assigneeId: text().references(() => users.id),
    subject: text().notNull(),
    category: text().notNull().default("general"),
    priority: text().notNull().default("normal"),
    status: text().notNull().default("OPEN"), // OPEN | PENDING | RESOLVED | CLOSED
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("support_tickets_number_idx").on(t.ticketNumber),
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_requester_idx").on(t.requesterId),
  ],
);

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: id(),
    ticketId: text()
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    isInternal: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("support_ticket_messages_ticket_idx").on(t.ticketId)],
);
