import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { emptyTextArray, id, money, softDelete, timestamps, tsvector } from "./_helpers";
import { companies } from "./companies";
import { priceTypeEnum, productStatusEnum, savedItemTypeEnum } from "./enums";
import { users } from "./identity";
import { certifications, productCategories } from "./reference";

export const products = pgTable(
  "products",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    categoryId: text()
      .notNull()
      .references(() => productCategories.id),
    slug: text().notNull(),
    sku: text(),
    title: text().notNull(),
    titleVi: text(),
    shortDescription: text(),
    description: text(),
    descriptionVi: text(),
    status: productStatusEnum().notNull().default("DRAFT"),
    rejectionReason: text(),
    reviewedById: text().references(() => users.id),
    priceType: priceTypeEnum().notNull().default("TIERED"),
    currency: text().notNull().default("USD"),
    basePrice: money("base_price"),
    moq: integer().notNull().default(1),
    unit: text().notNull().default("pieces"),
    hasSample: boolean().notNull().default(false),
    samplePrice: money("sample_price"),
    sampleLeadDays: integer(),
    leadTimeDays: integer(),
    leadTimeNote: text(),
    customizable: boolean().notNull().default(false),
    oemAvailable: boolean().notNull().default(false),
    odmAvailable: boolean().notNull().default(false),
    packagingDetails: text(),
    shippingInfo: text(),
    hsCode: text(),
    originCountry: text().notNull().default("VN"),
    brand: text(),
    model: text(),
    videoUrl: text(),
    keywords: text().array().notNull().default(emptyTextArray),
    viewCount: integer().notNull().default(0),
    inquiryCount: integer().notNull().default(0),
    rfqCount: integer().notNull().default(0),
    orderCount: integer().notNull().default(0),
    isFeatured: boolean().notNull().default(false),
    featuredUntil: timestamp({ withTimezone: true }),
    searchBoost: integer().notNull().default(0),
    seoTitle: text(),
    seoDescription: text(),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    ...softDelete(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): ReturnType<typeof sql> =>
        sql`setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.title}, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.titleVi}, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(immutable_array_to_string(${products.keywords}, ' '))), 'B') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.shortDescription}, ''))), 'B') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.description}, ''))), 'C') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.descriptionVi}, ''))), 'C') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${products.brand}, ''))), 'B')`,
    ),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_company_status_idx").on(t.companyId, t.status),
    index("products_category_status_idx").on(t.categoryId, t.status),
    index("products_status_published_idx").on(t.status, t.publishedAt),
    index("products_featured_idx").on(t.isFeatured),
    index("products_search_idx").using("gin", t.searchVector),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text().notNull(),
    alt: text(),
    sortOrder: integer().notNull().default(0),
    isPrimary: boolean().notNull().default(false),
    width: integer(),
    height: integer(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productPriceTiers = pgTable(
  "product_price_tiers",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    minQty: integer().notNull(),
    maxQty: integer(), // null = "and above"
    price: money("price").notNull(),
    currency: text().notNull().default("USD"),
  },
  (t) => [index("product_price_tiers_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text(),
    name: text().notNull(),
    attributes: jsonb().$type<Record<string, string>>().notNull(),
    price: money("price"),
    moq: integer(),
    imageUrl: text(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [index("product_variants_product_idx").on(t.productId)],
);

export const productSpecifications = pgTable(
  "product_specifications",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text().notNull(),
    value: text().notNull(),
    unit: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("product_specifications_product_idx").on(t.productId)],
);

export const productCertifications = pgTable(
  "product_certifications",
  {
    productId: text()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    certificationId: text()
      .notNull()
      .references(() => certifications.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.certificationId] })],
);

export const savedItems = pgTable(
  "saved_items",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: savedItemTypeEnum().notNull(),
    productId: text().references(() => products.id, { onDelete: "cascade" }),
    supplierCompanyId: text().references(() => companies.id, { onDelete: "cascade" }),
    rfqId: text(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("saved_items_user_product_idx").on(t.userId, t.productId),
    uniqueIndex("saved_items_user_supplier_idx").on(t.userId, t.supplierCompanyId),
    uniqueIndex("saved_items_user_rfq_idx").on(t.userId, t.rfqId),
    index("saved_items_user_type_idx").on(t.userId, t.type),
  ],
);
