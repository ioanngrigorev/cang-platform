import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";
import { companies } from "./companies";
import { documents } from "./documents";
import {
  complianceCheckTypeEnum,
  complianceStatusEnum,
  riskFlagStatusEnum,
  riskSeverityEnum,
  sanctionsStatusEnum,
  verificationStatusEnum,
  verificationTypeEnum,
} from "./enums";
import { users } from "./identity";

export const verifications = pgTable(
  "verifications",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: verificationTypeEnum().notNull(),
    status: verificationStatusEnum().notNull().default("PENDING"),
    data: jsonb().$type<Record<string, unknown>>(), // submitted form data
    notes: text(), // reviewer notes
    rejectionReason: text(),
    submittedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp({ withTimezone: true }),
    reviewedById: text().references(() => users.id),
    expiresAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("verifications_company_type_idx").on(t.companyId, t.type), index("verifications_status_idx").on(t.status)],
);

export const complianceChecks = pgTable(
  "compliance_checks",
  {
    id: id(),
    companyId: text().references(() => companies.id, { onDelete: "cascade" }),
    userId: text().references(() => users.id, { onDelete: "cascade" }),
    type: complianceCheckTypeEnum().notNull(),
    provider: text(), // manual | complyadvantage | ...
    status: complianceStatusEnum().notNull().default("PENDING"),
    result: jsonb().$type<Record<string, unknown>>(),
    riskScore: integer(),
    notes: text(),
    checkedAt: timestamp({ withTimezone: true }),
    reviewedById: text().references(() => users.id),
    nextReviewAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("compliance_checks_company_idx").on(t.companyId, t.type), index("compliance_checks_status_idx").on(t.status)],
);

export const beneficialOwners = pgTable(
  "beneficial_owners",
  {
    id: id(),
    companyId: text()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fullName: text().notNull(),
    nationality: text(),
    dateOfBirth: timestamp({ withTimezone: true }),
    ownershipPercent: numeric({ precision: 5, scale: 2, mode: "number" }),
    role: text(),
    isPep: boolean().notNull().default(false),
    sanctionsStatus: sanctionsStatusEnum().notNull().default("NOT_SCREENED"),
    idDocumentId: text().references(() => documents.id),
    ...timestamps(),
  },
  (t) => [index("beneficial_owners_company_idx").on(t.companyId)],
);

export const riskFlags = pgTable(
  "risk_flags",
  {
    id: id(),
    companyId: text().references(() => companies.id),
    entityType: text().notNull(), // ORDER | PAYMENT | COMPANY | USER | REVIEW | RFQ
    entityId: text().notNull(),
    ruleCode: text().notNull(),
    severity: riskSeverityEnum().notNull().default("MEDIUM"),
    status: riskFlagStatusEnum().notNull().default("OPEN"),
    description: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>(),
    resolvedById: text().references(() => users.id),
    resolvedAt: timestamp({ withTimezone: true }),
    resolution: text(),
    ...timestamps(),
  },
  (t) => [index("risk_flags_entity_idx").on(t.entityType, t.entityId), index("risk_flags_status_idx").on(t.status, t.severity)],
);
