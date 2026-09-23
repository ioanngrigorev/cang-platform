"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { sha256 } from "@/modules/auth/session";
import { apiKeyIdSchema, createApiKeySchema } from "./schemas";

function revalidate() {
  revalidatePath("/[locale]/seller/api", "page");
}

export type CreatedApiKey = { id: string; name: string; prefix: string; plainKey: string; scopes: string[] };

/**
 * Generate a key of the form `cang_<prefix>_<secret>`. Only the SHA-256 hash is stored; the plain
 * key is returned once so the page can show it a single time.
 */
export async function createApiKeyAction(_prev: ActionResult<CreatedApiKey> | null, formData: FormData): Promise<ActionResult<CreatedApiKey>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.apikeys.manage", seller: true });
    const parsed = parseInput(createApiKeySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    const prefix = randomBytes(4).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const plainKey = `cang_${prefix}_${secret}`;
    const [row] = await db
      .insert(apiKeys)
      .values({
        companyId: company.id,
        createdById: user.id,
        name: d.name,
        prefix,
        keyHash: sha256(plainKey),
        scopes: d.scopes,
        status: "ACTIVE",
        expiresAt: d.expiresInDays ? new Date(Date.now() + d.expiresInDays * 86400000) : null,
      })
      .returning({ id: apiKeys.id });
    await audit({ actorId: user.id, action: "apikey.create", entityType: "apiKey", entityId: row.id, after: { name: d.name, prefix, scopes: d.scopes } });
    revalidate();
    return ok({ id: row.id, name: d.name, prefix, plainKey, scopes: d.scopes }, "API key created. Copy it now — it will not be shown again.");
  });
}

export async function revokeApiKeyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.apikeys.manage", seller: true });
    const parsed = parseInput(apiKeyIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [row] = await db
      .select({ id: apiKeys.id, status: apiKeys.status, prefix: apiKeys.prefix })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, parsed.data.apiKeyId), eq(apiKeys.companyId, company.id)))
      .limit(1);
    if (!row) throw new ActionError("API key not found.", "NOT_FOUND");
    if (row.status === "REVOKED") throw new ActionError("This key is already revoked.", "INVALID_STATE");
    await db.update(apiKeys).set({ status: "REVOKED", revokedAt: new Date() }).where(eq(apiKeys.id, row.id));
    await audit({ actorId: user.id, action: "apikey.revoke", entityType: "apiKey", entityId: row.id, before: { status: row.status }, after: { status: "REVOKED", prefix: row.prefix } });
    revalidate();
    return ok(undefined, "API key revoked.");
  });
}
