import "server-only";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, companies, logisticsProviders } from "@/db/schema";
import { sha256 } from "@/modules/auth/session";

export type PartnerApiContext = { companyId: string; companyName: string; providerId: string; providerName: string; keyId: string; scopes: string[] };

export function apiError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * Bearer API key of a logistics-partner company (created in Partner portal → Integrations).
 * Returns the context or a ready 401/403 response.
 */
export async function authenticatePartnerApi(req: Request, scope: "shipments:read" | "shipments:write"): Promise<PartnerApiContext | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("cang_")) return apiError(401, "Missing or malformed API key. Send `Authorization: Bearer cang_…`.");
  const [row] = await db
    .select({ key: apiKeys, company: { id: companies.id, name: companies.name, isLogisticsPartner: companies.isLogisticsPartner }, provider: { id: logisticsProviders.id, name: logisticsProviders.name, isActive: logisticsProviders.isActive } })
    .from(apiKeys)
    .innerJoin(companies, eq(companies.id, apiKeys.companyId))
    .leftJoin(logisticsProviders, eq(logisticsProviders.companyId, companies.id))
    .where(and(eq(apiKeys.keyHash, sha256(key)), eq(apiKeys.status, "ACTIVE")))
    .limit(1);
  if (!row) return apiError(401, "Unknown or revoked API key.");
  if (row.key.expiresAt && row.key.expiresAt < new Date()) return apiError(401, "This API key has expired.");
  if (!row.company.isLogisticsPartner || !row.provider?.id) return apiError(403, "This key does not belong to a logistics partner.");
  if (!row.provider.isActive) return apiError(403, "Your partner account is waiting for CANG approval.");
  if (!row.key.scopes.includes(scope)) return apiError(403, `This key lacks the ${scope} scope.`);
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.key.id)).catch(() => {});
  return { companyId: row.company.id, companyName: row.company.name, providerId: row.provider.id, providerName: row.provider.name, keyId: row.key.id, scopes: row.key.scopes };
}
