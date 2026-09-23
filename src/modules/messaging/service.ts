import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Db, type Tx } from "@/db";
import { companies, companyMembers, conversationParticipants, conversations, documents, messages, orders, products, quotations, rfqs } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { truncate } from "@/lib/utils";
import { audit } from "@/modules/audit/log";
import { notifyUser } from "@/modules/notifications/service";
import { canSupplierViewRfq } from "@/modules/rfq/service";
import type { ConversationContext, ConversationSide } from "./schemas";

type Executor = Db | Tx;

export const COMPANY_SUMMARY_COLUMNS = {
  id: true,
  name: true,
  nameVi: true,
  slug: true,
  logoUrl: true,
  countryCode: true,
  verificationStatus: true,
  isSeller: true,
  isBuyer: true,
} as const;
export type CompanySummary = Pick<typeof companies.$inferSelect, keyof typeof COMPANY_SUMMARY_COLUMNS>;

export type EntityLink = { productId: string | null; rfqId: string | null; quotationId: string | null; orderId: string | null };
const NO_LINK: EntityLink = { productId: null, rfqId: null, quotationId: null, orderId: null };

type MessageType = typeof messages.$inferInsert.type;
type ConversationRow = typeof conversations.$inferSelect;

const PREVIEW_LENGTH = 140;

/** Path of a conversation for a given side, without the locale prefix. */
export function conversationPath(side: ConversationSide, conversationId: string): string {
  return `/${side === "buyer" ? "buyer" : "seller"}/messages/${conversationId}`;
}

/**
 * The OPEN conversation between this buyer/supplier pair about the same entity, if any. The most specific link
 * wins (order > quotation > RFQ > product); a GENERAL conversation is one with no entity at all.
 */
export async function findOpenConversation(input: { buyerCompanyId: string; supplierCompanyId: string; context?: ConversationContext } & Partial<EntityLink>, executor: Executor = db) {
  const entity = input.orderId
    ? eq(conversations.orderId, input.orderId)
    : input.quotationId
      ? eq(conversations.quotationId, input.quotationId)
      : input.rfqId
        ? and(eq(conversations.rfqId, input.rfqId), isNull(conversations.quotationId), isNull(conversations.orderId))
        : input.productId
          ? and(eq(conversations.productId, input.productId), isNull(conversations.rfqId), isNull(conversations.quotationId), isNull(conversations.orderId))
          : and(isNull(conversations.productId), isNull(conversations.rfqId), isNull(conversations.quotationId), isNull(conversations.orderId));
  const row = await executor.query.conversations.findFirst({
    where: and(eq(conversations.buyerCompanyId, input.buyerCompanyId), eq(conversations.supplierCompanyId, input.supplierCompanyId), eq(conversations.status, "OPEN"), entity),
    columns: { id: true },
    orderBy: [desc(conversations.lastMessageAt)],
  });
  return row ?? null;
}

async function companySummary(id: string, executor: Executor = db): Promise<CompanySummary | null> {
  const row = await executor.query.companies.findFirst({ where: and(eq(companies.id, id), isNull(companies.deletedAt)), columns: COMPANY_SUMMARY_COLUMNS });
  return row ?? null;
}

/** Conversation row if `companyId` is one of its parties; throws NOT_FOUND otherwise. */
export async function assertParty(conversationId: string, companyId: string, executor: Executor = db): Promise<ConversationRow> {
  const [c] = await executor.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!c || (c.buyerCompanyId !== companyId && c.supplierCompanyId !== companyId)) throw new ActionError("Conversation not found.", "NOT_FOUND");
  return c;
}

export function sideFor(c: { buyerCompanyId: string | null }, companyId: string): ConversationSide {
  return c.buyerCompanyId === companyId ? "buyer" : "supplier";
}

/**
 * Works out which side the actor is on for the requested entity and checks both companies are really its
 * parties. Returns the normalised link (a quotation also links its RFQ).
 */
async function resolveSides(
  actor: CompanySummary,
  counterparty: CompanySummary,
  input: { side?: ConversationSide | null; context?: ConversationContext | null } & Partial<EntityLink>,
): Promise<{ side: ConversationSide; context: ConversationContext; link: EntityLink }> {
  const isPair = (buyerId: string, supplierId: string): ConversationSide | null =>
    buyerId === actor.id && supplierId === counterparty.id ? "buyer" : supplierId === actor.id && buyerId === counterparty.id ? "supplier" : null;

  let resolved: { side: ConversationSide; context: ConversationContext; link: EntityLink } | null = null;
  if (input.orderId) {
    const [o] = await db.select({ b: orders.buyerCompanyId, s: orders.supplierCompanyId }).from(orders).where(and(eq(orders.id, input.orderId), isNull(orders.deletedAt))).limit(1);
    const side = o ? isPair(o.b, o.s) : null;
    if (!side) throw new ActionError("Order not found.", "NOT_FOUND");
    resolved = { side, context: "ORDER", link: { ...NO_LINK, orderId: input.orderId } };
  } else if (input.quotationId) {
    const q = await db.query.quotations.findFirst({ where: and(eq(quotations.id, input.quotationId), isNull(quotations.deletedAt)), columns: { rfqId: true, supplierCompanyId: true }, with: { rfq: { columns: { buyerCompanyId: true } } } });
    const side = q ? isPair(q.rfq.buyerCompanyId, q.supplierCompanyId) : null;
    if (!side || !q) throw new ActionError("Quotation not found.", "NOT_FOUND");
    resolved = { side, context: "QUOTATION", link: { ...NO_LINK, rfqId: q.rfqId, quotationId: input.quotationId } };
  } else if (input.rfqId) {
    const [r] = await db.select({ b: rfqs.buyerCompanyId }).from(rfqs).where(and(eq(rfqs.id, input.rfqId), isNull(rfqs.deletedAt))).limit(1);
    if (!r) throw new ActionError("RFQ not found.", "NOT_FOUND");
    const side: ConversationSide | null = r.b === actor.id ? "buyer" : r.b === counterparty.id ? "supplier" : null;
    if (!side) throw new ActionError("RFQ not found.", "NOT_FOUND");
    const supplierId = side === "buyer" ? counterparty.id : actor.id;
    if (!(await canSupplierViewRfq(input.rfqId, supplierId))) throw new ActionError("This RFQ is not open to that supplier.", "FORBIDDEN");
    resolved = { side, context: "RFQ", link: { ...NO_LINK, rfqId: input.rfqId } };
  } else if (input.productId) {
    const [p] = await db.select({ companyId: products.companyId }).from(products).where(and(eq(products.id, input.productId), isNull(products.deletedAt))).limit(1);
    if (!p) throw new ActionError("Product not found.", "NOT_FOUND");
    const side: ConversationSide | null = p.companyId === counterparty.id ? "buyer" : p.companyId === actor.id ? "supplier" : null;
    if (!side) throw new ActionError("Product not found.", "NOT_FOUND");
    resolved = { side, context: "PRODUCT", link: { ...NO_LINK, productId: input.productId } };
  }

  if (resolved) {
    if (input.side && input.side !== resolved.side) throw new ActionError("You are not a party of that conversation.", "FORBIDDEN");
    return resolved;
  }

  // No entity: the roles come from what each company is.
  const side: ConversationSide | null =
    input.side ?? (actor.isBuyer && counterparty.isSeller ? "buyer" : actor.isSeller && counterparty.isBuyer ? "supplier" : null);
  if (!side) throw new ActionError("These companies cannot message each other.", "FORBIDDEN");
  if (side === "buyer" && (!actor.isBuyer || !counterparty.isSeller)) throw new ActionError("This action requires a buyer account and a supplier counterparty.", "FORBIDDEN");
  if (side === "supplier" && (!actor.isSeller || !counterparty.isBuyer)) throw new ActionError("This action requires a supplier account and a buyer counterparty.", "FORBIDDEN");
  // Entity contexts need their entity; without one only GENERAL (or DISPUTE) makes sense.
  const context: ConversationContext = input.context === "DISPUTE" ? "DISPUTE" : "GENERAL";
  return { side, context, link: NO_LINK };
}

/** Attachments the sender may attach: their company's (or their own) not-yet-attached documents. */
async function loadAttachments(ids: string[], senderId: string, senderCompanyId: string, executor: Executor) {
  if (!ids.length) return [];
  const rows = await executor
    .select({ id: documents.id, name: documents.name, mimeType: documents.mimeType, sizeBytes: documents.sizeBytes })
    .from(documents)
    .where(and(inArray(documents.id, ids), isNull(documents.deletedAt), isNull(documents.messageId), sql`(${documents.ownerCompanyId} = ${senderCompanyId} or ${documents.uploadedById} = ${senderId})`));
  if (rows.length !== ids.length) throw new ActionError("Some attachments could not be found. Please upload them again.", "NOT_FOUND");
  return rows;
}

function previewOf(body: string, attachments: Array<{ name: string }>): string {
  const text = body.trim() || attachments.map((a) => a.name).join(", ");
  return truncate(text, PREVIEW_LENGTH);
}

/** Inserts the message row, links its documents and bumps the conversation counters. Runs inside `tx`. */
async function insertMessage(
  tx: Tx,
  c: Pick<ConversationRow, "id" | "rfqId" | "quotationId" | "orderId" | "status">,
  input: { senderId: string; senderCompanyId: string; body: string; attachments: Array<{ id: string; name: string; mimeType: string; sizeBytes: number }>; type?: MessageType | null },
) {
  const now = new Date();
  const { attachments } = input;
  const type: MessageType = input.type ?? (attachments.length ? (attachments.every((a) => a.mimeType.startsWith("image/")) ? "IMAGE" : "FILE") : "TEXT");
  const first = attachments[0];
  const payload = first
    ? { documentId: first.id, name: first.name, sizeBytes: first.sizeBytes, mimeType: first.mimeType, documentIds: attachments.map((a) => a.id) }
    : null;
  const [message] = await tx
    .insert(messages)
    .values({ conversationId: c.id, senderId: input.senderId, type, body: input.body || null, payload, createdAt: now })
    .returning({ id: messages.id, createdAt: messages.createdAt });
  if (attachments.length) {
    await tx
      .update(documents)
      .set({ messageId: message.id, visibility: "COUNTERPARTY", rfqId: c.rfqId ?? undefined, quotationId: c.quotationId ?? undefined, orderId: c.orderId ?? undefined })
      .where(
        inArray(
          documents.id,
          attachments.map((a) => a.id),
        ),
      );
  }
  await tx
    .update(conversations)
    .set({
      lastMessageAt: now,
      lastMessagePreview: previewOf(input.body, attachments),
      messageCount: sql`${conversations.messageCount} + 1`,
      status: c.status === "ARCHIVED" ? "OPEN" : undefined,
      updatedAt: now,
    })
    .where(eq(conversations.id, c.id));
  await tx
    .insert(conversationParticipants)
    .values({ conversationId: c.id, userId: input.senderId, companyId: input.senderCompanyId, lastReadAt: now })
    .onConflictDoUpdate({ target: [conversationParticipants.conversationId, conversationParticipants.userId], set: { lastReadAt: now } });
  return { ...message, type };
}

/** In-app MESSAGE_NEW for every non-muted participant on the other side (email off). Called after commit. */
async function notifyCounterparty(
  c: Pick<ConversationRow, "id" | "buyerCompanyId" | "supplierCompanyId">,
  sender: { companyId: string; companyName: string },
  preview: string,
) {
  const otherCompanyId = sender.companyId === c.buyerCompanyId ? c.supplierCompanyId : c.buyerCompanyId;
  if (!otherCompanyId) return;
  const otherSide: ConversationSide = otherCompanyId === c.buyerCompanyId ? "buyer" : "supplier";
  const recipients = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, c.id), eq(conversationParticipants.companyId, otherCompanyId), eq(conversationParticipants.isMuted, false)));
  await Promise.all(
    recipients.map((r) =>
      notifyUser(r.userId, {
        type: "MESSAGE_NEW",
        title: `New message from ${sender.companyName}`,
        body: preview,
        link: conversationPath(otherSide, c.id),
        data: { conversationId: c.id },
        email: false,
      }),
    ),
  );
}

export type SendMessageResult = { id: string; conversationId: string; createdAt: Date };

/** Posts a message into a conversation the sender's company is a party of. */
export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  senderCompanyId: string;
  body: string;
  attachmentIds?: string[];
  type?: MessageType | null;
  /** Set by startConversation, which already consumed a rate-limit token. */
  skipRateLimit?: boolean;
}): Promise<SendMessageResult> {
  const c = await assertParty(input.conversationId, input.senderCompanyId);
  if (c.status === "BLOCKED") throw new ActionError("This conversation is blocked.", "INVALID_STATE");
  if (!input.skipRateLimit) {
    const rl = await rateLimit(`message:${input.senderId}`, RATE_LIMITS.message);
    if (!rl.allowed) throw new ActionError("You are sending messages too quickly. Please wait a moment.", "RATE_LIMITED");
  }
  const sender = await companySummary(input.senderCompanyId);
  if (!sender) throw new ActionError("Company not found.", "NOT_FOUND");
  const body = input.body.trim();
  const attachments = await loadAttachments(input.attachmentIds ?? [], input.senderId, input.senderCompanyId, db);
  if (!body && !attachments.length) throw new ActionError("Write a message or attach a file.", "VALIDATION", { body: ["Write a message or attach a file."] });

  const message = await db.transaction((tx) => insertMessage(tx, c, { senderId: input.senderId, senderCompanyId: input.senderCompanyId, body, attachments, type: input.type }));
  await notifyCounterparty(c, { companyId: sender.id, companyName: sender.name }, previewOf(body, attachments));
  await audit({ actorId: input.senderId, action: "message.send", entityType: "conversation", entityId: c.id, after: { messageId: message.id, type: message.type, attachments: attachments.length } });
  return { id: message.id, conversationId: c.id, createdAt: message.createdAt };
}

export type StartConversationResult = { id: string; side: ConversationSide; reused: boolean; messageId: string };

/**
 * Starts a conversation between the actor's company and a counterparty about an optional entity. If an OPEN
 * conversation about the same entity already exists between the pair, the message is posted there instead.
 */
export async function startConversation(input: {
  actorUserId: string;
  actorCompanyId: string;
  counterpartyCompanyId: string;
  side?: ConversationSide | null;
  context?: ConversationContext | null;
  productId?: string | null;
  rfqId?: string | null;
  quotationId?: string | null;
  orderId?: string | null;
  subject?: string | null;
  body: string;
  attachmentIds?: string[];
}): Promise<StartConversationResult> {
  if (input.counterpartyCompanyId === input.actorCompanyId) throw new ActionError("You cannot message your own company.", "VALIDATION");
  const [actor, counterparty] = await Promise.all([companySummary(input.actorCompanyId), companySummary(input.counterpartyCompanyId)]);
  if (!actor) throw new ActionError("Company not found.", "NOT_FOUND");
  if (!counterparty) throw new ActionError("That company could not be found.", "NOT_FOUND");
  const { side, context, link } = await resolveSides(actor, counterparty, input);
  const buyerCompanyId = side === "buyer" ? actor.id : counterparty.id;
  const supplierCompanyId = side === "buyer" ? counterparty.id : actor.id;

  const rl = await rateLimit(`message:${input.actorUserId}`, RATE_LIMITS.message);
  if (!rl.allowed) throw new ActionError("You are sending messages too quickly. Please wait a moment.", "RATE_LIMITED");

  const existing = await findOpenConversation({ buyerCompanyId, supplierCompanyId, context, ...link });
  if (existing) {
    const m = await sendMessage({ conversationId: existing.id, senderId: input.actorUserId, senderCompanyId: actor.id, body: input.body, attachmentIds: input.attachmentIds, skipRateLimit: true });
    return { id: existing.id, side, reused: true, messageId: m.id };
  }

  const body = input.body.trim();
  const attachments = await loadAttachments(input.attachmentIds ?? [], input.actorUserId, actor.id, db);
  if (!body && !attachments.length) throw new ActionError("Write a message or attach a file.", "VALIDATION", { body: ["Write a message or attach a file."] });

  const result = await db.transaction(async (tx) => {
    const now = new Date();
    const [c] = await tx
      .insert(conversations)
      .values({ subject: input.subject?.trim() || null, context, status: "OPEN", buyerCompanyId, supplierCompanyId, ...link, lastMessageAt: now, lastMessagePreview: null, messageCount: 0, createdAt: now, updatedAt: now })
      .returning();
    const members = await tx
      .select({ userId: companyMembers.userId, companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(and(inArray(companyMembers.companyId, [buyerCompanyId, supplierCompanyId]), eq(companyMembers.status, "ACTIVE")));
    const seen = new Set<string>();
    const participantRows = members
      .filter((m) => (seen.has(m.userId) ? false : (seen.add(m.userId), true)))
      .map((m) => ({ conversationId: c.id, userId: m.userId, companyId: m.companyId, lastReadAt: m.userId === input.actorUserId ? now : null, joinedAt: now }));
    if (!participantRows.some((p) => p.userId === input.actorUserId)) participantRows.push({ conversationId: c.id, userId: input.actorUserId, companyId: actor.id, lastReadAt: now, joinedAt: now });
    await tx.insert(conversationParticipants).values(participantRows);
    const m = await insertMessage(tx, c, { senderId: input.actorUserId, senderCompanyId: actor.id, body, attachments });
    return { conversation: c, messageId: m.id };
  });
  await notifyCounterparty(result.conversation, { companyId: actor.id, companyName: actor.name }, previewOf(body, attachments));
  await audit({
    actorId: input.actorUserId,
    action: "conversation.start",
    entityType: "conversation",
    entityId: result.conversation.id,
    after: { context, buyerCompanyId, supplierCompanyId, ...link, messageId: result.messageId },
  });
  return { id: result.conversation.id, side, reused: false, messageId: result.messageId };
}

/** Records that the user has seen everything in the conversation up to now. Safe to call on every view. */
export async function markRead(conversationId: string, userId: string, companyId: string): Promise<void> {
  await assertParty(conversationId, companyId);
  const now = new Date();
  await db
    .insert(conversationParticipants)
    .values({ conversationId, userId, companyId, lastReadAt: now })
    .onConflictDoUpdate({ target: [conversationParticipants.conversationId, conversationParticipants.userId], set: { lastReadAt: now } });
}

async function setStatus(conversationId: string, companyId: string, userId: string, status: "OPEN" | "ARCHIVED"): Promise<void> {
  const c = await assertParty(conversationId, companyId);
  if (c.status === "BLOCKED") throw new ActionError("This conversation is blocked.", "INVALID_STATE");
  if (c.status === status) return;
  await db.update(conversations).set({ status, updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  await audit({ actorId: userId, action: status === "ARCHIVED" ? "conversation.archive" : "conversation.unarchive", entityType: "conversation", entityId: conversationId, before: { status: c.status }, after: { status } });
}

export const archiveConversation = (conversationId: string, companyId: string, userId: string) => setStatus(conversationId, companyId, userId, "ARCHIVED");
export const unarchiveConversation = (conversationId: string, companyId: string, userId: string) => setStatus(conversationId, companyId, userId, "OPEN");

/** Flips the viewer's mute flag; muted participants get no MESSAGE_NEW notifications. Returns the new value. */
export async function toggleMute(conversationId: string, userId: string, companyId: string): Promise<boolean> {
  await assertParty(conversationId, companyId);
  const [row] = await db
    .insert(conversationParticipants)
    .values({ conversationId, userId, companyId, isMuted: true })
    .onConflictDoUpdate({ target: [conversationParticipants.conversationId, conversationParticipants.userId], set: { isMuted: sql`not ${conversationParticipants.isMuted}` } })
    .returning({ isMuted: conversationParticipants.isMuted });
  return row?.isMuted ?? false;
}
