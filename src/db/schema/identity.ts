import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, softDelete, timestamps } from "./_helpers";
import { authProviderEnum, platformRoleEnum, tokenPurposeEnum, userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull(),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    passwordHash: text(),
    name: text().notNull(),
    phone: text(),
    phoneVerifiedAt: timestamp({ withTimezone: true }),
    avatarUrl: text(),
    locale: text().notNull().default("en"),
    timezone: text().notNull().default("Asia/Ho_Chi_Minh"),
    platformRole: platformRoleEnum().notNull().default("USER"),
    status: userStatusEnum().notNull().default("ACTIVE"),
    twoFactorEnabled: boolean().notNull().default(false),
    twoFactorSecret: text(),
    lastLoginAt: timestamp({ withTimezone: true }),
    lastLoginIp: text(),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_phone_idx").on(t.phone),
    index("users_status_idx").on(t.status),
    index("users_platform_role_idx").on(t.platformRole),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: authProviderEnum().notNull(),
    providerAccountId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    expiresAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("auth_accounts_provider_idx").on(t.provider, t.providerAccountId),
    index("auth_accounts_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Company context the user is currently acting as (switchable in the UI). */
    activeCompanyId: text(),
    ipAddress: text(),
    userAgent: text(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: id(),
    userId: text().references(() => users.id, { onDelete: "cascade" }),
    identifier: text().notNull(), // email or phone
    tokenHash: text().notNull(),
    purpose: tokenPurposeEnum().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("verification_tokens_hash_idx").on(t.tokenHash),
    index("verification_tokens_identifier_idx").on(t.identifier, t.purpose),
  ],
);
