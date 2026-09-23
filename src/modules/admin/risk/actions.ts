"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { riskFlags } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { adminActor, revalidateAdmin } from "../context";
import { idSchema, optionalText } from "../shared";

const schema = z.object({ flagId: idSchema, status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]), resolution: optionalText(2000) });

export async function updateRiskFlagAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.compliance.review");
    const parsed = parseInput(schema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [flag] = await db.select().from(riskFlags).where(eq(riskFlags.id, parsed.data.flagId)).limit(1);
    if (!flag) throw new ActionError("Risk flag not found.", "NOT_FOUND");
    const closing = parsed.data.status !== "INVESTIGATING";
    if (closing && !parsed.data.resolution) throw new ActionError("Add a resolution note.", "VALIDATION", { resolution: ["Add a resolution note."] });
    await db
      .update(riskFlags)
      .set({ status: parsed.data.status, resolution: parsed.data.resolution ?? flag.resolution, resolvedById: closing ? user.id : null, resolvedAt: closing ? new Date() : null })
      .where(eq(riskFlags.id, flag.id));
    await log({ action: `admin.risk.${parsed.data.status.toLowerCase()}`, entityType: "risk_flag", entityId: flag.id, before: { status: flag.status }, after: { status: parsed.data.status, resolution: parsed.data.resolution, entity: `${flag.entityType}:${flag.entityId}` } });
    revalidateAdmin("/admin/risk", "/admin/moderation", "/admin");
    if (flag.companyId) revalidateAdmin(`/admin/companies/${flag.companyId}`);
    return ok(undefined, "Risk flag updated.");
  });
}
