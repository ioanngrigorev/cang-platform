import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, rating, softDelete, timestamps } from "./_helpers";
import { companies } from "./companies";
import { reviewStatusEnum } from "./enums";
import { users } from "./identity";
import { orders } from "./orders";
import { products } from "./products";

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    orderId: text().references(() => orders.id),
    productId: text().references(() => products.id),
    authorCompanyId: text()
      .notNull()
      .references(() => companies.id),
    authorUserId: text()
      .notNull()
      .references(() => users.id),
    targetCompanyId: text()
      .notNull()
      .references(() => companies.id),
    ratingQuality: integer().notNull(),
    ratingCommunication: integer().notNull(),
    ratingDelivery: integer().notNull(),
    ratingAccuracy: integer().notNull(),
    ratingService: integer().notNull(),
    ratingOverall: rating("rating_overall").notNull(),
    title: text(),
    body: text(),
    isVerifiedPurchase: boolean().notNull().default(false),
    status: reviewStatusEnum().notNull().default("PENDING"),
    fraudScore: integer().notNull().default(0),
    fraudSignals: jsonb().$type<Record<string, unknown>>(),
    moderatedById: text().references(() => users.id),
    moderationNote: text(),
    reply: text(),
    repliedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("reviews_order_author_idx").on(t.orderId, t.authorCompanyId),
    index("reviews_target_status_idx").on(t.targetCompanyId, t.status),
    index("reviews_product_status_idx").on(t.productId, t.status),
  ],
);
