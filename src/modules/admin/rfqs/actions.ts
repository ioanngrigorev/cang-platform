"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rfqs } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { idSchema, reasonSchema } from "../shared";

const closeSchema = z.object({ rfqId: idSchema, mode: z.enum(["CLOSED", "CANCELLED"]), reason: reasonSchema });
const extendSchema = z.object({
  rfqId: idSchema,
  quoteDeadline: z
    .string()
    .trim()
    .min(1, "Pick a new deadline")
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()) && d.getTime() > Date.now(), "The deadline must be in the future"),
});
const visibilitySchema = z.object({ rfqId: idSchema, visibility: z.enum(["PUBLIC", "INVITED_ONLY"]) });
const spamSchema = z.object({ rfqId: idSchema, reason: z.string().trim().max(1000).optional() });

async function load(rfqId: string) {
  const [r] = await db.select().from(rfqs).where(and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt))).limit(1);
  if (!r) throw new ActionError("RFQ not found.", "NOT_FOUND");
  return r;
}

function revalidate(rfqId: string) {
  revalidateAdmin("/admin/rfqs", `/admin/rfqs/${rfqId}`, "/admin");
}

const TERMINAL = ["AWARDED", "CANCELLED"];

export async function adminCloseRfqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.rfqs.write");
    const parsed = parseInput(closeSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.rfqId);
    if (TERMINAL.includes(r.status)) throw new ActionError("This RFQ is already closed.", "INVALID_STATE");
    await db.update(rfqs).set({ status: parsed.data.mode, closedAt: new Date() }).where(eq(rfqs.id, r.id));
    await log({ action: `admin.rfq.${parsed.data.mode.toLowerCase()}`, entityType: "rfq", entityId: r.id, before: { status: r.status }, after: { status: parsed.data.mode, reason: parsed.data.reason } });
    await notifyCompany(r.buyerCompanyId, { type: "SYSTEM", title: `RFQ ${r.rfqNumber} was ${parsed.data.mode === "CLOSED" ? "closed" : "cancelled"} by CANG`, body: parsed.data.reason, link: `/buyer/rfqs/${r.id}` });
    revalidate(r.id);
    return ok(undefined, parsed.data.mode === "CLOSED" ? "RFQ closed." : "RFQ cancelled.");
  });
}

export async function adminExtendRfqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.rfqs.write");
    const parsed = parseInput(extendSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.rfqId);
    if (!["OPEN", "CLOSED", "EXPIRED"].includes(r.status)) throw new ActionError("Only open or expired RFQs can be extended.", "INVALID_STATE");
    await db.update(rfqs).set({ quoteDeadline: parsed.data.quoteDeadline, expiresAt: parsed.data.quoteDeadline, status: "OPEN", closedAt: null }).where(eq(rfqs.id, r.id));
    await log({ action: "admin.rfq.extend", entityType: "rfq", entityId: r.id, before: { quoteDeadline: r.quoteDeadline, status: r.status }, after: { quoteDeadline: parsed.data.quoteDeadline, status: "OPEN" } });
    await notifyCompany(r.buyerCompanyId, { type: "SYSTEM", title: `RFQ ${r.rfqNumber}: quote deadline extended`, body: `New deadline: ${parsed.data.quoteDeadline.toISOString().slice(0, 10)}.`, link: `/buyer/rfqs/${r.id}`, email: false });
    revalidate(r.id);
    return ok(undefined, "Deadline extended.");
  });
}

export async function adminRfqVisibilityAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.rfqs.write");
    const parsed = parseInput(visibilitySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.rfqId);
    await db.update(rfqs).set({ visibility: parsed.data.visibility }).where(eq(rfqs.id, r.id));
    await log({ action: "admin.rfq.visibility", entityType: "rfq", entityId: r.id, before: { visibility: r.visibility }, after: { visibility: parsed.data.visibility } });
    await notifyCompany(r.buyerCompanyId, { type: "SYSTEM", title: `RFQ ${r.rfqNumber} is now ${parsed.data.visibility === "PUBLIC" ? "public" : "invited suppliers only"}`, link: `/buyer/rfqs/${r.id}`, email: false });
    revalidate(r.id);
    return ok(undefined, "Visibility updated.");
  });
}

export async function adminFlagRfqSpamAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.rfqs.write");
    const parsed = parseInput(spamSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.rfqId);
    await db.update(rfqs).set({ status: "CANCELLED", closedAt: new Date(), visibility: "INVITED_ONLY", isPriority: false }).where(eq(rfqs.id, r.id));
    await log({ action: "admin.rfq.flag_spam", entityType: "rfq", entityId: r.id, before: { status: r.status }, after: { status: "CANCELLED", spam: true, reason: parsed.data.reason ?? null } });
    await notifyCompany(r.buyerCompanyId, { type: "SYSTEM", title: `RFQ ${r.rfqNumber} was removed`, body: parsed.data.reason || "The request did not meet our marketplace guidelines.", link: `/buyer/rfqs/${r.id}` });
    revalidate(r.id);
    return ok(undefined, "RFQ flagged as spam and removed from the marketplace.");
  });
}
