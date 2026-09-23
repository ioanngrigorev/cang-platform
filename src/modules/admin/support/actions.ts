"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { supportTicketMessages, supportTickets } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyUser } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { checkbox, idSchema, optionalText } from "../shared";

const replySchema = z.object({ ticketId: idSchema, body: z.string().trim().min(2, "Write a reply").max(8000), isInternal: checkbox, status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional() });
const assignSchema = z.object({ ticketId: idSchema, assigneeId: z.string().trim().optional().transform((v) => (v ? v : null)) });
const statusSchema = z.object({ ticketId: idSchema, status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), note: optionalText(500) });

async function load(ticketId: string) {
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!t) throw new ActionError("Ticket not found.", "NOT_FOUND");
  return t;
}

function revalidate(ticketId: string) {
  revalidateAdmin("/admin/support", `/admin/support/${ticketId}`, "/admin");
}

export async function replyTicketAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.support.write");
    const parsed = parseInput(replySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const t = await load(parsed.data.ticketId);
    const nextStatus = parsed.data.status ?? (parsed.data.isInternal ? t.status : t.status === "OPEN" ? "PENDING" : t.status);
    await db.transaction(async (tx) => {
      await tx.insert(supportTicketMessages).values({ ticketId: t.id, authorId: user.id, body: parsed.data.body, isInternal: parsed.data.isInternal });
      await tx.update(supportTickets).set({ status: nextStatus, assigneeId: t.assigneeId ?? user.id }).where(eq(supportTickets.id, t.id));
    });
    await log({ action: parsed.data.isInternal ? "admin.support.internal_note" : "admin.support.reply", entityType: "support_ticket", entityId: t.id, before: { status: t.status }, after: { status: nextStatus } });
    if (!parsed.data.isInternal) {
      await notifyUser(t.requesterId, { type: "SYSTEM", title: `Reply on ticket ${t.ticketNumber}: ${t.subject}`, body: parsed.data.body.slice(0, 300), link: "/buyer/notifications", email: true });
    }
    revalidate(t.id);
    return ok(undefined, parsed.data.isInternal ? "Internal note saved." : "Reply sent.");
  });
}

export async function assignTicketAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.support.write");
    const parsed = parseInput(assignSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const t = await load(parsed.data.ticketId);
    const assigneeId = parsed.data.assigneeId ?? user.id;
    await db.update(supportTickets).set({ assigneeId, status: t.status === "OPEN" ? "PENDING" : t.status }).where(eq(supportTickets.id, t.id));
    await log({ action: "admin.support.assign", entityType: "support_ticket", entityId: t.id, before: { assigneeId: t.assigneeId }, after: { assigneeId } });
    revalidate(t.id);
    return ok(undefined, assigneeId === user.id ? "Ticket assigned to you." : "Ticket assigned.");
  });
}

export async function updateTicketAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.support.write");
    const parsed = parseInput(statusSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const t = await load(parsed.data.ticketId);
    const status = parsed.data.status ?? t.status;
    const priority = parsed.data.priority ?? t.priority;
    await db.update(supportTickets).set({ status, priority }).where(eq(supportTickets.id, t.id));
    if (parsed.data.note) await db.insert(supportTicketMessages).values({ ticketId: t.id, authorId: user.id, body: parsed.data.note, isInternal: true });
    await log({ action: "admin.support.update", entityType: "support_ticket", entityId: t.id, before: { status: t.status, priority: t.priority }, after: { status, priority, note: parsed.data.note } });
    if (status !== t.status && (status === "RESOLVED" || status === "CLOSED")) {
      await notifyUser(t.requesterId, { type: "SYSTEM", title: `Ticket ${t.ticketNumber} ${status === "RESOLVED" ? "resolved" : "closed"}`, body: t.subject, link: "/buyer/notifications", email: true });
    }
    revalidate(t.id);
    return ok(undefined, "Ticket updated.");
  });
}
