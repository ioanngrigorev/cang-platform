import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { customType, numeric, text, timestamp } from "drizzle-orm/pg-core";

/** Primary key: cuid2 string. */
export const id = () => text("id").primaryKey().$defaultFn(() => createId());

/** createdAt / updatedAt pair used by every table. */
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/** Soft deletion marker. */
export const softDelete = () => ({
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** Money amount: Decimal(18,4) surfaced as a JS number. */
export const money = (name: string) => numeric(name, { precision: 18, scale: 4, mode: "number" });
/** Money amount with 2 decimals (reporting / limits). */
export const money2 = (name: string) => numeric(name, { precision: 18, scale: 2, mode: "number" });
/** Percentage / rate with 4 decimals. */
export const rate = (name: string) => numeric(name, { precision: 12, scale: 4, mode: "number" });
/** Star rating average, 0.00 – 5.00 */
export const rating = (name: string) => numeric(name, { precision: 3, scale: 2, mode: "number" });

/** PostgreSQL tsvector (used for full-text search generated columns). */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Empty postgres text[] default. */
export const emptyTextArray = sql`'{}'::text[]`;
