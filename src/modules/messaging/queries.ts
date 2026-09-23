import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { alias, type PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { companies, conversationParticipants, conversations, documents, messages, orders, products, quotations, rfqs } from "@/db/schema";
import { canSupplierViewRfq } from "@/modules/rfq/service";
import type { ContextRef } from "./links";
import { CONVERSATION_CONTEXTS, type ConversationContext, type ConversationSide } from "./schemas";
import { findOpenConversation, type CompanySummary, COMPANY_SUMMARY_COLUMNS } from "./service";

export type { ContextRef } from "./links";

export type ConversationTab = "all" | "unread" | "archived";
export const CONVERSATION_TABS: ConversationTab[] = ["all", "unread", "archived"];

export type ConversationListItem = {
  id: string;
  subject: string | null;
  context: ConversationContext;
  status: "OPEN" | "ARCHIVED" | "BLOCKED";
  /** Which side of the conversation the viewing company is on. */
  side: ConversationSide;
  counterparty: CompanySummary;
  ref: ContextRef;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  messageCount: number;
  unread: number;
  isMuted: boolean;
};

export type ThreadAttachment = { id: string; name: string; url: string; mimeType: string; sizeBytes: number };

export type ThreadMessage = {
  id: string;
  type: typeof messages.$inferSelect.type;
  body: string | null;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  sender: { id: string; name: string; avatarUrl: string | null } | null;
  senderCompanyId: string | null;
  /** Sent by someone in the viewer's company. */
  own: boolean;
  /** Sent by the viewer. */
  mine: boolean;
  attachments: ThreadAttachment[];
};

const buyerCo = alias(companies, "buyer_co");
const supplierCo = alias(companies, "supplier_co");

function partyFilter(companyId: string): SQL {
  return or(eq(conversations.buyerCompanyId, companyId), eq(conversations.supplierCompanyId, companyId))!;
}

/**
 * Messages the viewer has not read yet: everything after the participant's lastReadAt that was not sent by
 * them. Requires `conversationParticipants` to be (left-)joined for that user; a missing row means "all unread".
 */
function unreadExpr(userId: string): SQL<number> {
  return sql<number>`(
    select count(*)::int from ${messages} m
    where m.conversation_id = ${conversations.id}
      and m.deleted_at is null
      and m.sender_id is distinct from ${userId}
      and m.created_at > coalesce(${conversationParticipants.lastReadAt}, '-infinity'::timestamptz)
  )`;
}

function participantJoin(userId: string) {
  return and(eq(conversationParticipants.conversationId, conversations.id), eq(conversationParticipants.userId, userId))!;
}

function sideOf(c: { buyerCompanyId: string | null }, companyId: string): ConversationSide {
  return c.buyerCompanyId === companyId ? "buyer" : "supplier";
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listConversations(
  companyId: string,
  userId: string,
  opts: { tab?: ConversationTab; q?: string | null; context?: string | null; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab: ConversationTab = opts.tab ?? "all";
  const q = opts.q?.trim().slice(0, 100) || null;
  const context = CONVERSATION_CONTEXTS.includes(opts.context as ConversationContext) ? (opts.context as ConversationContext) : null;
  const unread = unreadExpr(userId);
  const counterpartyName = sql`case when ${conversations.buyerCompanyId} = ${companyId} then ${supplierCo.name} else ${buyerCo.name} end`;
  const pattern = q ? `%${escapeLike(q)}%` : null;

  const where = and(
    partyFilter(companyId),
    tab === "archived" ? eq(conversations.status, "ARCHIVED") : ne(conversations.status, "ARCHIVED"),
    tab === "unread" ? sql`${unread} > 0` : undefined,
    context ? eq(conversations.context, context) : undefined,
    pattern ? or(ilike(conversations.subject, pattern), ilike(conversations.lastMessagePreview, pattern), ilike(counterpartyName, pattern)) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        conv: conversations,
        buyer: { ...pick(buyerCo) },
        supplier: { ...pick(supplierCo) },
        unread,
        isMuted: conversationParticipants.isMuted,
        product: { id: products.id, slug: products.slug, title: products.title, titleVi: products.titleVi },
        rfq: { id: rfqs.id, rfqNumber: rfqs.rfqNumber, title: rfqs.title },
        quotation: { id: quotations.id, quotationNumber: quotations.quotationNumber, total: quotations.total, currency: quotations.currency, validUntil: quotations.validUntil, status: quotations.status },
        order: { id: orders.id, orderNumber: orders.orderNumber },
      })
      .from(conversations)
      .leftJoin(buyerCo, eq(buyerCo.id, conversations.buyerCompanyId))
      .leftJoin(supplierCo, eq(supplierCo.id, conversations.supplierCompanyId))
      .leftJoin(conversationParticipants, participantJoin(userId))
      .leftJoin(products, eq(products.id, conversations.productId))
      .leftJoin(rfqs, eq(rfqs.id, conversations.rfqId))
      .leftJoin(quotations, eq(quotations.id, conversations.quotationId))
      .leftJoin(orders, eq(orders.id, conversations.orderId))
      .where(where)
      .orderBy(sql`${conversations.lastMessageAt} desc nulls last`, desc(conversations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(conversations)
      .leftJoin(buyerCo, eq(buyerCo.id, conversations.buyerCompanyId))
      .leftJoin(supplierCo, eq(supplierCo.id, conversations.supplierCompanyId))
      .leftJoin(conversationParticipants, participantJoin(userId))
      .where(where),
  ]);

  const items: ConversationListItem[] = rows.flatMap((r) => {
    const side = sideOf(r.conv, companyId);
    const counterparty = side === "buyer" ? r.supplier : r.buyer;
    if (!counterparty?.id) return [];
    return [
      {
        id: r.conv.id,
        subject: r.conv.subject,
        context: r.conv.context,
        status: r.conv.status,
        side,
        counterparty: counterparty as CompanySummary,
        ref: buildRef(r.conv.context, r),
        lastMessageAt: r.conv.lastMessageAt,
        lastMessagePreview: r.conv.lastMessagePreview,
        messageCount: r.conv.messageCount,
        unread: Number(r.unread ?? 0),
        isMuted: r.isMuted ?? false,
      },
    ];
  });

  return { rows: items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

type CompanyColumnKeys = "id" | "name" | "nameVi" | "slug" | "logoUrl" | "countryCode" | "verificationStatus" | "isSeller" | "isBuyer";

/** The company columns every messaging view needs, from the base table or an alias of it. */
function pick<T extends Record<CompanyColumnKeys, PgColumn>>(t: T) {
  return {
    id: t.id,
    name: t.name,
    nameVi: t.nameVi,
    slug: t.slug,
    logoUrl: t.logoUrl,
    countryCode: t.countryCode,
    verificationStatus: t.verificationStatus,
    isSeller: t.isSeller,
    isBuyer: t.isBuyer,
  };
}

type RefSource = {
  product?: { id: string | null; slug: string | null; title: string | null; titleVi: string | null } | null;
  rfq?: { id: string | null; rfqNumber: string | null; title: string | null } | null;
  quotation?: { id: string | null; quotationNumber: string | null; total: number | null; currency: string | null; validUntil: Date | null; status: string | null } | null;
  order?: { id: string | null; orderNumber: string | null } | null;
};

function buildRef(context: ConversationContext, r: RefSource): ContextRef {
  if (context === "ORDER" && r.order?.id && r.order.orderNumber) return { type: "ORDER", id: r.order.id, number: r.order.orderNumber };
  if (context === "QUOTATION" && r.quotation?.id && r.quotation.quotationNumber) {
    return { type: "QUOTATION", id: r.quotation.id, number: r.quotation.quotationNumber, total: r.quotation.total, currency: r.quotation.currency, validUntil: r.quotation.validUntil, status: r.quotation.status };
  }
  if (context === "RFQ" && r.rfq?.id && r.rfq.rfqNumber) return { type: "RFQ", id: r.rfq.id, number: r.rfq.rfqNumber, title: r.rfq.title ?? "" };
  if (context === "PRODUCT" && r.product?.id && r.product.slug) return { type: "PRODUCT", id: r.product.id, slug: r.product.slug, title: r.product.title ?? "", titleVi: r.product.titleVi };
  // Fall back to whichever entity is linked, so a GENERAL conversation with a product still gets a chip.
  if (r.order?.id && r.order.orderNumber) return { type: "ORDER", id: r.order.id, number: r.order.orderNumber };
  if (r.quotation?.id && r.quotation.quotationNumber) {
    return { type: "QUOTATION", id: r.quotation.id, number: r.quotation.quotationNumber, total: r.quotation.total, currency: r.quotation.currency, validUntil: r.quotation.validUntil, status: r.quotation.status };
  }
  if (r.rfq?.id && r.rfq.rfqNumber) return { type: "RFQ", id: r.rfq.id, number: r.rfq.rfqNumber, title: r.rfq.title ?? "" };
  if (r.product?.id && r.product.slug) return { type: "PRODUCT", id: r.product.id, slug: r.product.slug, title: r.product.title ?? "", titleVi: r.product.titleVi };
  return null;
}

export async function conversationTabCounts(companyId: string, userId: string): Promise<Record<ConversationTab, number>> {
  const unread = unreadExpr(userId);
  const [row] = await db
    .select({
      all: sql<number>`count(*) filter (where ${conversations.status} <> 'ARCHIVED')::int`,
      unread: sql<number>`count(*) filter (where ${conversations.status} <> 'ARCHIVED' and ${unread} > 0)::int`,
      archived: sql<number>`count(*) filter (where ${conversations.status} = 'ARCHIVED')::int`,
    })
    .from(conversations)
    .leftJoin(conversationParticipants, participantJoin(userId))
    .where(partyFilter(companyId));
  return { all: row?.all ?? 0, unread: row?.unread ?? 0, archived: row?.archived ?? 0 };
}

/** Number of non-archived conversations with unread messages for this user — feeds the dashboard badge. */
export async function unreadConversationCount(companyId: string, userId: string): Promise<number> {
  const unread = unreadExpr(userId);
  const [row] = await db
    .select({ n: count() })
    .from(conversations)
    .leftJoin(conversationParticipants, participantJoin(userId))
    .where(and(partyFilter(companyId), ne(conversations.status, "ARCHIVED"), sql`${unread} > 0`));
  return row?.n ?? 0;
}

export const THREAD_PAGE_SIZE = 50;
const THREAD_MAX = 500;

/**
 * One conversation with its participants, the counterparty, the linked entity and the latest `limit` messages
 * (oldest → newest). `hasEarlier` tells the UI to offer a "load earlier" link with a larger limit.
 */
export async function getConversation(companyId: string, userId: string, id: string, opts: { limit?: number } = {}) {
  const limit = Math.min(THREAD_MAX, Math.max(THREAD_PAGE_SIZE, opts.limit ?? THREAD_PAGE_SIZE));
  const c = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), partyFilter(companyId)),
    with: {
      buyerCompany: { columns: COMPANY_SUMMARY_COLUMNS },
      supplierCompany: { columns: COMPANY_SUMMARY_COLUMNS },
      product: { columns: { id: true, slug: true, title: true, titleVi: true } },
      rfq: { columns: { id: true, rfqNumber: true, title: true } },
      quotation: { columns: { id: true, quotationNumber: true, total: true, currency: true, validUntil: true, status: true } },
      order: { columns: { id: true, orderNumber: true } },
      participants: { with: { user: { columns: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!c) return null;
  const side = sideOf(c, companyId);
  const counterparty = side === "buyer" ? c.supplierCompany : c.buyerCompany;
  const self = side === "buyer" ? c.buyerCompany : c.supplierCompany;
  if (!counterparty || !self) return null;

  const rows = await db.query.messages.findMany({
    where: and(eq(messages.conversationId, id), isNull(messages.deletedAt)),
    with: { sender: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [desc(messages.createdAt), desc(messages.id)],
    limit: limit + 1,
  });
  const hasEarlier = rows.length > limit;
  const pageRows = rows.slice(0, limit).reverse();

  const docs = pageRows.length
    ? await db
        .select({ id: documents.id, name: documents.name, url: documents.url, mimeType: documents.mimeType, sizeBytes: documents.sizeBytes, messageId: documents.messageId })
        .from(documents)
        .where(
          and(
            inArray(
              documents.messageId,
              pageRows.map((m) => m.id),
            ),
            isNull(documents.deletedAt),
          ),
        )
        .orderBy(documents.createdAt)
    : [];
  const docsByMessage = new Map<string, ThreadAttachment[]>();
  for (const d of docs) {
    if (!d.messageId) continue;
    (docsByMessage.get(d.messageId) ?? docsByMessage.set(d.messageId, []).get(d.messageId)!).push({ id: d.id, name: d.name, url: d.url, mimeType: d.mimeType, sizeBytes: d.sizeBytes });
  }

  const companyByUser = new Map(c.participants.map((p) => [p.userId, p.companyId] as const));
  const viewer = c.participants.find((p) => p.userId === userId) ?? null;
  const counterpartyReadAt = c.participants
    .filter((p) => p.companyId === counterparty.id && p.lastReadAt)
    .reduce<Date | null>((max, p) => (!max || (p.lastReadAt && p.lastReadAt > max) ? p.lastReadAt : max), null);

  const thread: ThreadMessage[] = pageRows.map((m) => {
    const senderCompanyId = m.senderId ? (companyByUser.get(m.senderId) ?? null) : null;
    return {
      id: m.id,
      type: m.type,
      body: m.body,
      payload: m.payload ?? null,
      createdAt: m.createdAt,
      sender: m.sender ? { id: m.sender.id, name: m.sender.name, avatarUrl: m.sender.avatarUrl } : null,
      senderCompanyId,
      own: !!m.senderId && senderCompanyId === companyId,
      mine: m.senderId === userId,
      attachments: docsByMessage.get(m.id) ?? [],
    };
  });

  return {
    id: c.id,
    subject: c.subject,
    context: c.context,
    status: c.status,
    side,
    self,
    counterparty,
    ref: buildRef(c.context, c),
    participants: c.participants.map((p) => ({ userId: p.userId, companyId: p.companyId, name: p.user.name, avatarUrl: p.user.avatarUrl, lastReadAt: p.lastReadAt, isMuted: p.isMuted })),
    isMuted: viewer?.isMuted ?? false,
    counterpartyReadAt,
    messageCount: c.messageCount,
    messages: thread,
    hasEarlier,
    limit,
    createdAt: c.createdAt,
  };
}

export type ConversationThread = NonNullable<Awaited<ReturnType<typeof getConversation>>>;

/** Query params accepted by /buyer/messages/new and /seller/messages/new. */
export type NewConversationParams = { supplier?: string; company?: string; product?: string; rfq?: string; quotation?: string; order?: string };

export type NewConversationTarget =
  | {
      ok: true;
      counterparty: CompanySummary;
      context: ConversationContext;
      productId: string | null;
      rfqId: string | null;
      quotationId: string | null;
      orderId: string | null;
      /** Human label of the linked entity (product title, RFQ title, quotation/order number). */
      refLabel: string | null;
      refLabelVi: string | null;
      existingConversationId: string | null;
    }
  | { ok: false; reason: "no_target" | "not_found" | "forbidden" | "self" };

/**
 * Resolves the counterparty and the linked entity for the "new message" page from its query params, checking
 * that the acting company is really a party of that entity. Pure read; the service re-validates on submit.
 */
export async function resolveNewConversation(actor: { id: string; isBuyer: boolean; isSeller: boolean }, side: ConversationSide, params: NewConversationParams): Promise<NewConversationTarget> {
  const supplierSlug = params.supplier?.trim() || null;
  const companyId = params.company?.trim() || null;
  const productSlug = params.product?.trim() || null;
  const rfqId = params.rfq?.trim() || null;
  const quotationId = params.quotation?.trim() || null;
  const orderId = params.order?.trim() || null;

  let counterpartyId: string | null = null;
  let context: ConversationContext = "GENERAL";
  let refLabel: string | null = null;
  let refLabelVi: string | null = null;
  let link: { productId: string | null; rfqId: string | null; quotationId: string | null; orderId: string | null } = { productId: null, rfqId: null, quotationId: null, orderId: null };

  if (orderId) {
    const [o] = await db.select({ id: orders.id, orderNumber: orders.orderNumber, buyerCompanyId: orders.buyerCompanyId, supplierCompanyId: orders.supplierCompanyId }).from(orders).where(and(eq(orders.id, orderId), isNull(orders.deletedAt))).limit(1);
    if (!o) return { ok: false, reason: "not_found" };
    const mine = side === "buyer" ? o.buyerCompanyId : o.supplierCompanyId;
    if (mine !== actor.id) return { ok: false, reason: "forbidden" };
    counterpartyId = side === "buyer" ? o.supplierCompanyId : o.buyerCompanyId;
    context = "ORDER";
    refLabel = o.orderNumber;
    link = { productId: null, rfqId: null, quotationId: null, orderId: o.id };
  } else if (quotationId) {
    const q = await db.query.quotations.findFirst({
      where: and(eq(quotations.id, quotationId), isNull(quotations.deletedAt)),
      columns: { id: true, quotationNumber: true, supplierCompanyId: true, rfqId: true },
      with: { rfq: { columns: { buyerCompanyId: true, title: true } } },
    });
    if (!q) return { ok: false, reason: "not_found" };
    const mine = side === "buyer" ? q.rfq.buyerCompanyId : q.supplierCompanyId;
    if (mine !== actor.id) return { ok: false, reason: "forbidden" };
    counterpartyId = side === "buyer" ? q.supplierCompanyId : q.rfq.buyerCompanyId;
    context = "QUOTATION";
    refLabel = `${q.quotationNumber} · ${q.rfq.title}`;
    link = { productId: null, rfqId: q.rfqId, quotationId: q.id, orderId: null };
  } else if (rfqId) {
    const [r] = await db.select({ id: rfqs.id, rfqNumber: rfqs.rfqNumber, title: rfqs.title, buyerCompanyId: rfqs.buyerCompanyId }).from(rfqs).where(and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt))).limit(1);
    if (!r) return { ok: false, reason: "not_found" };
    if (side === "buyer") {
      if (r.buyerCompanyId !== actor.id) return { ok: false, reason: "forbidden" };
      counterpartyId = supplierSlug ? await companyIdBySlug(supplierSlug) : companyId;
      if (!counterpartyId) return { ok: false, reason: supplierSlug || companyId ? "not_found" : "no_target" };
    } else {
      if (!(await canSupplierViewRfq(r.id, actor.id))) return { ok: false, reason: "forbidden" };
      counterpartyId = r.buyerCompanyId;
    }
    context = "RFQ";
    refLabel = `${r.rfqNumber} · ${r.title}`;
    link = { productId: null, rfqId: r.id, quotationId: null, orderId: null };
  } else if (productSlug) {
    const [p] = await db.select({ id: products.id, title: products.title, titleVi: products.titleVi, companyId: products.companyId }).from(products).where(and(eq(products.slug, productSlug), isNull(products.deletedAt))).limit(1);
    if (!p) return { ok: false, reason: "not_found" };
    if (side === "buyer") {
      counterpartyId = p.companyId;
    } else {
      if (p.companyId !== actor.id) return { ok: false, reason: "forbidden" };
      counterpartyId = companyId;
      if (!counterpartyId) return { ok: false, reason: "no_target" };
    }
    context = "PRODUCT";
    refLabel = p.title;
    refLabelVi = p.titleVi;
    link = { productId: p.id, rfqId: null, quotationId: null, orderId: null };
  } else if (supplierSlug) {
    counterpartyId = await companyIdBySlug(supplierSlug);
    if (!counterpartyId) return { ok: false, reason: "not_found" };
  } else if (companyId) {
    counterpartyId = companyId;
  } else {
    return { ok: false, reason: "no_target" };
  }

  if (!counterpartyId) return { ok: false, reason: "not_found" };
  if (counterpartyId === actor.id) return { ok: false, reason: "self" };
  const counterparty = await db.query.companies.findFirst({ where: and(eq(companies.id, counterpartyId), isNull(companies.deletedAt)), columns: COMPANY_SUMMARY_COLUMNS });
  if (!counterparty) return { ok: false, reason: "not_found" };
  if (context === "GENERAL" || context === "PRODUCT") {
    // Without an order/RFQ/quotation to anchor the roles, the roles come from capabilities.
    if (side === "buyer" && (!actor.isBuyer || !counterparty.isSeller)) return { ok: false, reason: "forbidden" };
    if (side === "supplier" && (!actor.isSeller || !counterparty.isBuyer)) return { ok: false, reason: "forbidden" };
  }

  const buyerCompanyId = side === "buyer" ? actor.id : counterparty.id;
  const supplierCompanyId = side === "buyer" ? counterparty.id : actor.id;
  const existing = await findOpenConversation({ buyerCompanyId, supplierCompanyId, context, ...link });

  return {
    ok: true,
    counterparty,
    context,
    ...link,
    refLabel,
    refLabelVi,
    existingConversationId: existing?.id ?? null,
  };
}

async function companyIdBySlug(slug: string): Promise<string | null> {
  const [c] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.slug, slug), isNull(companies.deletedAt))).limit(1);
  return c?.id ?? null;
}
