import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";
import { companies } from "./companies";
import { conversationContextEnum, conversationStatusEnum, messageTypeEnum } from "./enums";
import { users } from "./identity";

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    subject: text(),
    context: conversationContextEnum().notNull().default("GENERAL"),
    status: conversationStatusEnum().notNull().default("OPEN"),
    buyerCompanyId: text().references(() => companies.id),
    supplierCompanyId: text().references(() => companies.id),
    productId: text(),
    rfqId: text(),
    quotationId: text(),
    orderId: text(),
    lastMessageAt: timestamp({ withTimezone: true }),
    lastMessagePreview: text(),
    messageCount: integer().notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("conversations_buyer_idx").on(t.buyerCompanyId, t.lastMessageAt),
    index("conversations_supplier_idx").on(t.supplierCompanyId, t.lastMessageAt),
    index("conversations_order_idx").on(t.orderId),
    index("conversations_rfq_idx").on(t.rfqId),
    index("conversations_product_idx").on(t.productId),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: id(),
    conversationId: text()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: text().references(() => companies.id),
    lastReadAt: timestamp({ withTimezone: true }),
    isMuted: boolean().notNull().default(false),
    joinedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("conversation_participants_unique_idx").on(t.conversationId, t.userId),
    index("conversation_participants_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: text()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text().references(() => users.id),
    type: messageTypeEnum().notNull().default("TEXT"),
    body: text(),
    bodyLang: text(), // detected source language
    translations: jsonb().$type<Record<string, string>>(), // filled by a translation provider later
    payload: jsonb().$type<Record<string, unknown>>(), // structured content for QUOTATION / COUNTER_OFFER / CONTRACT / SYSTEM
    editedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);
