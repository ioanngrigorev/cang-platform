/**
 * Step 6 — conversations with participants and messages (TEXT, QUOTATION, COUNTER_OFFER, FILE with
 * a document row, SYSTEM), keeping the denormalised conversation counters consistent.
 */
import type { Db } from "@/db";
import { conversationParticipants, conversations, documents, messages } from "@/db/schema";
import { CONVERSATIONS } from "../data/conversations";
import { insertAll, type World } from "./context";

type ConversationRow = typeof conversations.$inferInsert;
type ParticipantRow = typeof conversationParticipants.$inferInsert;
type MessageRow = typeof messages.$inferInsert;
type DocumentRow = typeof documents.$inferInsert;

export async function seedMessaging(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const conversationRows: ConversationRow[] = [];
  const participantRows: ParticipantRow[] = [];
  const messageRows: MessageRow[] = [];
  const documentRows: DocumentRow[] = [];

  for (const c of CONVERSATIONS) {
    const buyer = w.buyer(c.buyer);
    const supplier = w.supplier(c.supplier);
    const conversationId = rng.id();
    const ordered = [...c.messages].sort((a, b) => b.hoursAgo - a.hoursAgo);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const refIds = {
      productId: c.context === "PRODUCT" ? w.product(c.ref).id : null,
      rfqId: c.context === "RFQ" ? w.rfq(c.ref).id : c.context === "QUOTATION" ? w.rfq(w.quotation(c.ref).rfqKey).id : null,
      quotationId: c.context === "QUOTATION" ? w.quotation(c.ref).id : null,
      orderId: c.context === "ORDER" ? w.order(c.ref).id : null,
    };
    const createdAt = w.hoursAgo(first.hoursAgo + 1);
    const lastAt = w.hoursAgo(last.hoursAgo);

    conversationRows.push({
      id: conversationId,
      subject: c.subject,
      context: c.context,
      status: "OPEN",
      buyerCompanyId: buyer.id,
      supplierCompanyId: supplier.id,
      ...refIds,
      lastMessageAt: lastAt,
      lastMessagePreview: preview(last.body),
      messageCount: c.messages.length,
      createdAt,
      updatedAt: lastAt,
    });
    participantRows.push(
      { id: rng.id(), conversationId, userId: buyer.ownerUserId, companyId: buyer.id, lastReadAt: w.hoursAgo(c.buyerReadHoursAgo), isMuted: false, joinedAt: createdAt },
      { id: rng.id(), conversationId, userId: supplier.ownerUserId, companyId: supplier.id, lastReadAt: w.hoursAgo(c.supplierReadHoursAgo), isMuted: false, joinedAt: createdAt },
    );
    if (supplier.salesUserId) {
      participantRows.push({ id: rng.id(), conversationId, userId: supplier.salesUserId, companyId: supplier.id, lastReadAt: w.hoursAgo(c.supplierReadHoursAgo + rng.int(2, 30)), isMuted: false, joinedAt: createdAt });
    }

    for (const m of ordered) {
      const messageId = rng.id();
      const at = w.hoursAgo(m.hoursAgo);
      const senderId = m.from === "SYSTEM" ? null : m.from === "BUYER" ? buyer.ownerUserId : supplier.ownerUserId;
      const type = m.type ?? "TEXT";
      let payload: Record<string, unknown> | null = null;
      if (m.type === "QUOTATION") {
        const q = w.quotation(m.quotation);
        payload = { quotationId: q.id, quotationNumber: q.number, total: q.total, currency: q.currency, leadTimeDays: q.leadTimeDays };
      } else if (m.type === "COUNTER_OFFER") {
        payload = { unitPrice: m.unitPrice, quantity: m.quantity, currency: "USD", note: m.note };
      } else if (m.type === "SYSTEM") {
        payload = m.payload;
      } else if (m.type === "FILE") {
        const docId = rng.id();
        const storageKey = `seed/messages/${conversationId}/${m.file.name}`;
        documentRows.push({
          id: docId,
          ownerCompanyId: m.from === "BUYER" ? buyer.id : supplier.id,
          uploadedById: senderId,
          type: m.file.type,
          name: m.file.name,
          mimeType: "application/pdf",
          sizeBytes: m.file.sizeBytes,
          storageKey,
          url: `/api/files/${storageKey}`,
          visibility: "COUNTERPARTY",
          messageId,
          rfqId: refIds.rfqId,
          orderId: refIds.orderId,
          createdAt: at,
        });
        payload = { documentId: docId, name: m.file.name, sizeBytes: m.file.sizeBytes, mimeType: "application/pdf" };
      }
      const bodyLang = m.type === undefined || m.type === "TEXT" ? (m.lang ?? "en") : "en";
      messageRows.push({ id: messageId, conversationId, senderId, type, body: m.body, bodyLang, payload, createdAt: at });
    }
  }

  await insertAll(db, conversations, conversationRows);
  await insertAll(db, conversationParticipants, participantRows);
  await insertAll(db, messages, messageRows);
  await insertAll(db, documents, documentRows);
  console.log(`  conversations: ${conversationRows.length}, messages: ${messageRows.length}, attachments: ${documentRows.length}`);
}

function preview(body: string): string {
  return body.length > 140 ? `${body.slice(0, 137).trimEnd()}…` : body;
}
