import { z } from "zod";

export const CONVERSATION_CONTEXTS = ["GENERAL", "PRODUCT", "RFQ", "QUOTATION", "ORDER", "DISPUTE"] as const;
export type ConversationContext = (typeof CONVERSATION_CONTEXTS)[number];

export const CONVERSATION_SIDES = ["buyer", "supplier"] as const;
export type ConversationSide = (typeof CONVERSATION_SIDES)[number];

const optionalId = z
  .string()
  .trim()
  .max(64)
  .optional()
  .transform((v) => (v ? v : null));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Accepts `attachmentIds` (single), `attachmentIds[]` (array) or nothing; de-duplicated and trimmed. */
const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))))
  .refine((v) => v.length <= 10, "You can attach up to 10 files.");

export const MESSAGE_MAX_LENGTH = 8000;

export const startConversationSchema = z
  .object({
    counterpartyCompanyId: z.string().trim().min(1, "Choose who to message.").max(64),
    side: z.enum(CONVERSATION_SIDES),
    context: z.enum(CONVERSATION_CONTEXTS).default("GENERAL"),
    productId: optionalId,
    rfqId: optionalId,
    quotationId: optionalId,
    orderId: optionalId,
    subject: optionalText(200),
    body: z.string().trim().max(MESSAGE_MAX_LENGTH, `Keep your message under ${MESSAGE_MAX_LENGTH} characters.`).default(""),
    attachmentIds: idList,
  })
  .refine((v) => v.body.length > 0 || v.attachmentIds.length > 0, { path: ["body"], message: "Write a message or attach a file." });
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(64),
    body: z.string().trim().max(MESSAGE_MAX_LENGTH, `Keep your message under ${MESSAGE_MAX_LENGTH} characters.`).default(""),
    attachmentIds: idList,
  })
  .refine((v) => v.body.length > 0 || v.attachmentIds.length > 0, { path: ["body"], message: "Write a message or attach a file." });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const conversationIdSchema = z.object({ conversationId: z.string().trim().min(1).max(64) });
