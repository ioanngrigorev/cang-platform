import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, authenticatePartnerApi } from "@/modules/partner/api-auth";
import { apiShipmentDetail } from "@/modules/partner/api";

/** GET /api/partner/v1/shipments/{shipment_number} — shipment, pickup, cargo and event history. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
  const auth = await authenticatePartnerApi(req, "shipments:read");
  if (auth instanceof NextResponse) return auth;
  const { number } = await ctx.params;
  const data = await apiShipmentDetail(auth.providerId, decodeURIComponent(number));
  if (!data) return apiError(404, "Shipment not found or not assigned to you.");
  return NextResponse.json({ data });
}
