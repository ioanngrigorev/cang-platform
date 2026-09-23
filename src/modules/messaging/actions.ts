"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { conversationIdSchema, sendMessageSchema, startConversationSchema } from "./schemas";
import { archiveConversation, conversationPath, markRead, sendMessage, startConversation, toggleMute, unarchiveConversation, type SendMessageResult } from "./service";

/** Both dashboards render the same inbox, so every write refreshes both trees. */
function revalidateMessages(conversationId?: string) {
  for (const base of ["/[locale]/buyer/messages", "/[locale]/seller/messages"]) {
    revalidatePath(base, "page");
    revalidatePath(`${base}/[id]`, "page");
    if (conversationId) revalidatePath(`${base}/${conversationId}`, "page");
  }
  revalidatePath("/[locale]/buyer", "page");
  revalidatePath("/[locale]/seller", "page");
}

export async function startConversationAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.write" });
    const parsed = parseInput(startConversationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { counterpartyCompanyId, side, context, productId, rfqId, quotationId, orderId, subject, body, attachmentIds } = parsed.data;
    const result = await startConversation({ actorUserId: user.id, actorCompanyId: company.id, counterpartyCompanyId, side, context, productId, rfqId, quotationId, orderId, subject, body, attachmentIds });
    revalidateMessages(result.id);
    redirect({ href: conversationPath(result.side, result.id), locale: await getLocale() });
    return ok({ id: result.id });
  });
}

export async function sendMessageAction(_prev: ActionResult<SendMessageResult> | null, formData: FormData): Promise<ActionResult<SendMessageResult>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.write" });
    const parsed = parseInput(sendMessageSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const result = await sendMessage({ conversationId: parsed.data.conversationId, senderId: user.id, senderCompanyId: company.id, body: parsed.data.body, attachmentIds: parsed.data.attachmentIds });
    revalidateMessages(result.conversationId);
    return ok(result);
  });
}

export async function markReadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.read" });
    const parsed = parseInput(conversationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await markRead(parsed.data.conversationId, user.id, company.id);
    revalidateMessages(parsed.data.conversationId);
    return ok(undefined);
  });
}

export async function archiveConversationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.write" });
    const parsed = parseInput(conversationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await archiveConversation(parsed.data.conversationId, company.id, user.id);
    revalidateMessages(parsed.data.conversationId);
    return ok(undefined, (await getTranslations("messaging.toasts"))("archived"));
  });
}

export async function unarchiveConversationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.write" });
    const parsed = parseInput(conversationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await unarchiveConversation(parsed.data.conversationId, company.id, user.id);
    revalidateMessages(parsed.data.conversationId);
    return ok(undefined, (await getTranslations("messaging.toasts"))("unarchived"));
  });
}

export async function toggleMuteAction(_prev: ActionResult<{ isMuted: boolean }> | null, formData: FormData): Promise<ActionResult<{ isMuted: boolean }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "messages.read" });
    const parsed = parseInput(conversationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const isMuted = await toggleMute(parsed.data.conversationId, user.id, company.id);
    revalidateMessages(parsed.data.conversationId);
    const t = await getTranslations("messaging.toasts");
    return ok({ isMuted }, isMuted ? t("muted") : t("unmuted"));
  });
}
