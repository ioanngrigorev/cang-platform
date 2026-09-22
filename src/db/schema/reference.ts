import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { emptyTextArray, id, timestamps } from "./_helpers";

export const countries = pgTable("countries", {
  code: text().primaryKey(), // ISO 3166-1 alpha-2
  name: text().notNull(),
  nameVi: text().notNull(),
  region: text(),
  dialCode: text(),
  isEnabled: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps(),
});

/** Vietnamese provinces / cities; industrial-cluster landing content lives here too. */
export const provinces = pgTable(
  "provinces",
  {
    id: id(),
    countryCode: text()
      .notNull()
      .default("VN")
      .references(() => countries.code),
    code: text().notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    nameVi: text().notNull(),
    region: text(), // North / Central / South
    isIndustrialCluster: boolean().notNull().default(false),
    clusterHeadline: text(),
    clusterHeadlineVi: text(),
    clusterDescription: text(),
    clusterDescriptionVi: text(),
    heroImageUrl: text(),
    majorIndustries: text().array().notNull().default(emptyTextArray), // industry slugs
    keyFacts: jsonb().$type<Record<string, string | number>>(),
    seoTitle: text(),
    seoDescription: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("provinces_slug_idx").on(t.slug),
    uniqueIndex("provinces_country_code_idx").on(t.countryCode, t.code),
    index("provinces_cluster_idx").on(t.isIndustrialCluster),
  ],
);

export const currencies = pgTable("currencies", {
  code: text().primaryKey(), // ISO 4217
  name: text().notNull(),
  symbol: text().notNull(),
  decimals: integer().notNull().default(2),
  rateToUsd: numeric({ precision: 18, scale: 8, mode: "number" }).notNull().default(1),
  isEnabled: boolean().notNull().default(true),
  isDefault: boolean().notNull().default(false),
  sortOrder: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const industries = pgTable(
  "industries",
  {
    id: id(),
    slug: text().notNull(),
    name: text().notNull(),
    nameVi: text().notNull(),
    description: text(),
    descriptionVi: text(),
    icon: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [uniqueIndex("industries_slug_idx").on(t.slug)],
);

export const productCategories = pgTable(
  "product_categories",
  {
    id: id(),
    parentId: text(),
    industryId: text().references(() => industries.id),
    slug: text().notNull(),
    name: text().notNull(),
    nameVi: text().notNull(),
    description: text(),
    descriptionVi: text(),
    icon: text(),
    imageUrl: text(),
    level: integer().notNull().default(0),
    path: text().notNull().default(""), // slash-joined ancestor slugs
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    isFeatured: boolean().notNull().default(false),
    seoTitle: text(),
    seoDescription: text(),
    productCount: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("product_categories_slug_idx").on(t.slug),
    index("product_categories_parent_idx").on(t.parentId),
    index("product_categories_industry_idx").on(t.industryId),
    index("product_categories_active_idx").on(t.isActive, t.sortOrder),
  ],
);

export const certifications = pgTable(
  "certifications",
  {
    id: id(),
    code: text().notNull(), // ISO9001, BSCI, WRAP, OEKO_TEX ...
    name: text().notNull(),
    description: text(),
    category: text(), // quality | social | environmental | product-safety
    issuingBody: text(),
    iconUrl: text(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("certifications_code_idx").on(t.code)],
);
