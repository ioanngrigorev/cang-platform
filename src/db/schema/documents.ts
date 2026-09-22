import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id } from "./_helpers";
import { documentTypeEnum, documentVisibilityEnum } from "./enums";

/**
 * Central file registry. Every uploaded file (specs, certificates, invoices, B/L, inspection reports, chat attachments)
 * is a Document; foreign keys to the owning aggregates are plain text columns (no FK constraints) to avoid import cycles
 * and to allow a document to outlive the entity it was attached to.
 */
export const documents = pgTable(
  "documents",
  {
    id: id(),
    ownerCompanyId: text(),
    uploadedById: text(),
    type: documentTypeEnum().notNull().default("OTHER"),
    name: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull(),
    url: text().notNull(),
    checksum: text(),
    visibility: documentVisibilityEnum().notNull().default("COMPANY"),
    orderId: text(),
    rfqId: text(),
    quotationId: text(),
    messageId: text(),
    verificationId: text(),
    disputeId: text(),
    shipmentId: text(),
    financingApplicationId: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("documents_owner_idx").on(t.ownerCompanyId, t.type),
    index("documents_order_idx").on(t.orderId),
    index("documents_rfq_idx").on(t.rfqId),
    index("documents_message_idx").on(t.messageId),
    index("documents_verification_idx").on(t.verificationId),
  ],
);
