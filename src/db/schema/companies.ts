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
import { emptyTextArray, id, money2, rate, rating, softDelete, timestamps, tsvector } from "./_helpers";
import {
  badgeSourceEnum,
  businessTypeEnum,
  companyStatusEnum,
  employeeRangeEnum,
  incotermEnum,
  invitationStatusEnum,
  memberRoleEnum,
  memberStatusEnum,
  sanctionsStatusEnum,
  verificationStatusEnum,
} from "./enums";
import { users } from "./identity";
import { certifications, countries, industries, provinces } from "./reference";
import { documents } from "./documents";

export const companies = pgTable(
  "companies",
  {
    id: id(),
    slug: text().notNull(),
    name: text().notNull(),
    nameVi: text(),
    legalName: text(),
    businessType: businessTypeEnum().notNull().default("MANUFACTURER"),
    isSeller: boolean().notNull().default(false),
    isBuyer: boolean().notNull().default(false),
    status: companyStatusEnum().notNull().default("PENDING"),
    countryCode: text()
      .notNull()
      .default("VN")
      .references(() => countries.code),
    provinceId: text().references(() => provinces.id),
    city: text(),
    address: text(),
    postalCode: text(),
    taxId: text(),
    registrationNumber: text(),
    website: text(),
    email: text(),
    phone: text(),
    logoUrl: text(),
    coverUrl: text(),
    tagline: text(),
    taglineVi: text(),
    description: text(),
    descriptionVi: text(),
    yearEstablished: integer(),
    employeeRange: employeeRangeEnum(),
    annualRevenueUsd: money2("annual_revenue_usd"),
    languages: text().array().notNull().default(emptyTextArray),
    verificationStatus: verificationStatusEnum().notNull().default("UNVERIFIED"),
    verifiedAt: timestamp({ withTimezone: true }),
    kybStatus: verificationStatusEnum().notNull().default("UNVERIFIED"),
    sanctionsStatus: sanctionsStatusEnum().notNull().default("NOT_SCREENED"),
    responseRate: rate("response_rate"), // percent
    avgResponseHours: rate("avg_response_hours"),
    ratingAvg: rating("rating_avg").notNull().default(0),
    ratingCount: integer().notNull().default(0),
    transactionCount: integer().notNull().default(0),
    transactionVolumeUsd: money2("transaction_volume_usd").notNull().default(0),
    viewCount: integer().notNull().default(0),
    isFeatured: boolean().notNull().default(false),
    featuredUntil: timestamp({ withTimezone: true }),
    searchBoost: integer().notNull().default(0),
    seoTitle: text(),
    seoDescription: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ...timestamps(),
    ...softDelete(),
    /** Full-text search vector (generated). Vietnamese + English text with 'simple' config. */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): ReturnType<typeof sql> =>
        sql`setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.name}, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.nameVi}, ''))), 'A') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.tagline}, ''))), 'B') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.description}, ''))), 'C') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.descriptionVi}, ''))), 'C') || setweight(to_tsvector('simple', immutable_unaccent(coalesce(${companies.city}, ''))), 'B')`,
    ),
  },
  (t) => [
    uniqueIndex("companies_slug_idx").on(t.slug),
    index("companies_seller_idx").on(t.status, t.isSeller),
    index("companies_buyer_idx").on(t.status, t.isBuyer),
    index("companies_province_idx").on(t.provinceId),
    index("companies_country_idx").on(t.countryCode),
    index("companies_verification_idx").on(t.verificationStatus),
    index("companies_business_type_idx").on(t.businessType),
    index("companies_rating_idx").on(t.ratingAvg),
    index("companies_search_idx").using("gin", t.searchVector),
  ],
);

export const companyMembers = pgTable(
  "company_members",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum().notNull().default("STAFF"),
    title: text(),
    status: memberStatusEnum().notNull().default("ACTIVE"),
    isPrimary: boolean().notNull().default(false),
    invitedById: text(),
    joinedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("company_members_company_user_idx").on(t.companyId, t.userId),
    index("company_members_user_idx").on(t.userId),
  ],
);

export const companyInvitations = pgTable(
  "company_invitations",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    email: text().notNull(),
    role: memberRoleEnum().notNull().default("STAFF"),
    tokenHash: text().notNull(),
    status: invitationStatusEnum().notNull().default("PENDING"),
    invitedById: text()
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("company_invitations_token_idx").on(t.tokenHash),
    index("company_invitations_company_idx").on(t.companyId),
    index("company_invitations_email_idx").on(t.email),
  ],
);

export const manufacturerProfiles = pgTable("manufacturer_profiles", {
  id: id(),
  companyId: text()
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  factoryAddress: text(),
  factorySizeSqm: integer(),
  productionLines: integer(),
  annualCapacity: text(), // free text, e.g. "2,000,000 pcs"
  annualCapacityValue: money2("annual_capacity_value"),
  annualCapacityUnit: text(),
  oemCapable: boolean().notNull().default(false),
  odmCapable: boolean().notNull().default(false),
  privateLabelCapable: boolean().notNull().default(false),
  minOrderValueUsd: money2("min_order_value_usd"),
  avgLeadTimeDays: integer(),
  sampleLeadTimeDays: integer(),
  exportCountries: text().array().notNull().default(emptyTextArray), // ISO codes
  mainMarkets: text().array().notNull().default(emptyTextArray),
  exportPercentage: integer(),
  exportExperienceYears: integer(),
  rdStaffCount: integer(),
  qcStaffCount: integer(),
  mainEquipment: text(),
  mainMaterials: text(),
  paymentTermsAccepted: text().array().notNull().default(emptyTextArray), // TT, LC, DP ...
  acceptedIncoterms: incotermEnum().array().notNull().default(sql`'{}'::incoterm[]`),
  videoUrls: text().array().notNull().default(emptyTextArray),
  factoryTourAvailable: boolean().notNull().default(false),
  ...timestamps(),
});

export const buyerProfiles = pgTable("buyer_profiles", {
  id: id(),
  companyId: text()
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  sourcingCategories: text().array().notNull().default(emptyTextArray), // category slugs
  annualPurchasingVolumeUsd: money2("annual_purchasing_volume_usd"),
  preferredCurrency: text().notNull().default("USD"),
  destinationCountries: text().array().notNull().default(emptyTextArray),
  preferredIncoterms: incotermEnum().array().notNull().default(sql`'{}'::incoterm[]`),
  companySizeNote: text(),
  ...timestamps(),
});

export const companyIndustries = pgTable(
  "company_industries",
  {
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    industryId: text()
      .notNull()
      .references(() => industries.id, { onDelete: "cascade" }),
    isPrimary: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.industryId] }), index("company_industries_industry_idx").on(t.industryId)],
);

export const companyCertifications = pgTable(
  "company_certifications",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    certificationId: text()
      .notNull()
      .references(() => certifications.id),
    certificateNumber: text(),
    issuedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    documentId: text().references(() => documents.id),
    status: verificationStatusEnum().notNull().default("PENDING"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("company_certifications_unique_idx").on(t.companyId, t.certificationId)],
);

export const companyMedia = pgTable(
  "company_media",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    kind: text().notNull().default("PHOTO"), // PHOTO | VIDEO
    url: text().notNull(),
    thumbnailUrl: text(),
    caption: text(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("company_media_company_idx").on(t.companyId)],
);

/** Badges are data, not code. Rules (ruleConfig) are evaluated by the badge engine; admins can also grant manually. */
export const badges = pgTable(
  "badges",
  {
    id: id(),
    code: text().notNull(), // VERIFIED_MANUFACTURER, FACTORY_AUDITED, EXPORT_READY, FAST_RESPONSE, TOP_SUPPLIER
    name: text().notNull(),
    nameVi: text().notNull(),
    description: text(),
    descriptionVi: text(),
    icon: text(),
    color: text(),
    ruleConfig: jsonb().$type<Record<string, unknown>>(),
    isAutomatic: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [uniqueIndex("badges_code_idx").on(t.code)],
);

export const companyBadges = pgTable(
  "company_badges",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    badgeId: text()
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    source: badgeSourceEnum().notNull().default("RULE"),
    grantedById: text().references(() => users.id),
    grantedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp({ withTimezone: true }),
    note: text(),
  },
  (t) => [uniqueIndex("company_badges_unique_idx").on(t.companyId, t.badgeId)],
);
