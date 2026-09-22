import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, money, money2, timestamps } from "./_helpers";
import { companies } from "./companies";
import { adCampaignStatusEnum, adEventTypeEnum, adPlacementEnum, adPricingModelEnum } from "./enums";
import { products } from "./products";
import { productCategories } from "./reference";

export const adProducts = pgTable(
  "ad_products",
  {
    id: id(),
    code: text().notNull(),
    placement: adPlacementEnum().notNull(),
    name: text().notNull(),
    nameVi: text().notNull(),
    description: text(),
    pricingModel: adPricingModelEnum().notNull().default("FLAT_DAILY"),
    price: money("price").notNull(),
    currency: text().notNull().default("USD"),
    minBudget: money2("min_budget"),
    maxSlots: integer(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("ad_products_code_idx").on(t.code)],
);

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    adProductId: text()
      .notNull()
      .references(() => adProducts.id),
    name: text().notNull(),
    status: adCampaignStatusEnum().notNull().default("DRAFT"),
    budget: money2("budget").notNull(),
    spent: money2("spent").notNull().default(0),
    dailyBudget: money2("daily_budget"),
    currency: text().notNull().default("USD"),
    startAt: timestamp({ withTimezone: true }).notNull(),
    endAt: timestamp({ withTimezone: true }),
    targeting: jsonb().$type<{ categories?: string[]; countries?: string[]; keywords?: string[] }>(),
    rejectionReason: text(),
    ...timestamps(),
  },
  (t) => [index("ad_campaigns_company_idx").on(t.companyId, t.status), index("ad_campaigns_active_idx").on(t.status, t.startAt, t.endAt)],
);

export const advertisements = pgTable(
  "advertisements",
  {
    id: id(),
    campaignId: text()
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    placement: adPlacementEnum().notNull(),
    productId: text().references(() => products.id),
    supplierCompanyId: text().references(() => companies.id),
    categoryId: text().references(() => productCategories.id),
    keyword: text(),
    creative: jsonb().$type<{ headline?: string; imageUrl?: string; cta?: string }>(),
    impressions: integer().notNull().default(0),
    clicks: integer().notNull().default(0),
    leads: integer().notNull().default(0),
    rfqs: integer().notNull().default(0),
    orders: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [index("advertisements_placement_idx").on(t.placement, t.isActive), index("advertisements_category_idx").on(t.categoryId, t.placement)],
);

export const adEvents = pgTable(
  "ad_events",
  {
    id: id(),
    advertisementId: text()
      .notNull()
      .references(() => advertisements.id, { onDelete: "cascade" }),
    type: adEventTypeEnum().notNull(),
    userId: text(),
    sessionId: text(),
    cost: numeric({ precision: 18, scale: 6, mode: "number" }).notNull().default(0),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ad_events_ad_type_idx").on(t.advertisementId, t.type, t.createdAt)],
);
