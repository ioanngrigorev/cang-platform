import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatePartnerApi } from "@/modules/partner/api-auth";
import { apiListShipments } from "@/modules/partner/api";

/** GET /api/partner/v1/shipments?status=active|<STATUS>&updated_since=ISO&limit=50&offset=0 */
export async function GET(req: NextRequest) {
  const ctx = await authenticatePartnerApi(req, "shipments:read");
  if (ctx instanceof NextResponse) return ctx;
  const sp = req.nextUrl.searchParams;
  const since = sp.get("updated_since");
  const updatedSince = since ? new Date(since) : null;
  if (updatedSince && Number.isNaN(updatedSince.getTime())) return NextResponse.json({ error: "updated_since must be an ISO 8601 date" }, { status: 400 });
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const data = await apiListShipments(ctx.providerId, { status: sp.get("status"), updatedSince, limit, offset });
  return NextResponse.json({ data, limit, offset });
}
