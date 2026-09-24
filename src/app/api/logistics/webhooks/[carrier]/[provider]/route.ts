import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { logisticsProviders } from "@/db/schema";
import { sha256 } from "@/modules/auth/session";
import { parseCarrierWebhook } from "@/modules/logistics/tracking/carriers";
import { ingestCarrierEvents } from "@/modules/logistics/tracking/service";

/**
 * Carrier status callbacks (GHN / GHTK) for one logistics partner:
 *   POST /api/logistics/webhooks/{ghn|ghtk}/{PROVIDER_CODE}?token=…
 * The token is created in Partner portal → Integrations (only its hash is stored). Events are idempotent,
 * applied to that partner's shipment with this carrier + tracking number, and answered with 200 even when
 * no shipment matches (so carriers do not retry forever).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ carrier: string; provider: string }> }) {
  const { carrier: rawCarrier, provider: code } = await ctx.params;
  const carrier = rawCarrier.toUpperCase();
  if (carrier !== "GHN" && carrier !== "GHTK") return NextResponse.json({ error: "Unsupported carrier" }, { status: 404 });
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("x-cang-token") ?? "";
  const [provider] = await db.select({ id: logisticsProviders.id, apiConfig: logisticsProviders.apiConfig, isActive: logisticsProviders.isActive }).from(logisticsProviders).where(eq(logisticsProviders.code, code.toUpperCase())).limit(1);
  const expected = (provider?.apiConfig as Record<string, unknown> | null)?.webhookTokenHash;
  if (!provider || !provider.isActive || typeof expected !== "string" || !token || sha256(token) !== expected) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const parsed = parseCarrierWebhook(carrier, body);
  if (!parsed) return NextResponse.json({ error: "Unrecognised payload" }, { status: 400 });
  try {
    const res = await ingestCarrierEvents(carrier, parsed.trackingNumber, [parsed.event], "webhook", { providerId: provider.id });
    return NextResponse.json({ ok: true, matched: res.matched, applied: res.applied });
  } catch (err) {
    console.error("[webhook]", carrier, err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed" }, { status: 422 });
  }
}
