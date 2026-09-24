import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ActionError } from "@/lib/action";
import { setShipmentTracking } from "@/modules/logistics/tracking/service";
import { apiError, authenticatePartnerApi } from "@/modules/partner/api-auth";
import { apiShipmentByNumber, apiTrackingSchema, shipmentJson } from "@/modules/partner/api";

/** PUT /api/partner/v1/shipments/{shipment_number}/tracking — carrier, tracking number, vessel, ETD/ETA. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
  const auth = await authenticatePartnerApi(req, "shipments:write");
  if (auth instanceof NextResponse) return auth;
  const { number } = await ctx.params;
  const row = await apiShipmentByNumber(auth.providerId, decodeURIComponent(number));
  if (!row) return apiError(404, "Shipment not found or not assigned to you.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Expected a JSON body.");
  }
  const parsed = apiTrackingSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "Invalid tracking details.", { fields: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const updated = await setShipmentTracking(
      { kind: "PARTNER", userId: null, companyId: auth.companyId, via: "api" },
      { shipmentId: row.shipment.id, carrierCode: d.carrier_code, carrier: d.carrier, trackingNumber: d.tracking_number, vesselOrFlight: d.vessel_or_flight, containerNumber: d.container_number, etd: d.etd, eta: d.eta },
    );
    return NextResponse.json({ data: shipmentJson(updated) });
  } catch (err) {
    if (err instanceof ActionError) return apiError(422, err.message, { code: err.code });
    console.error("[partner-api] tracking", err);
    return apiError(500, "Could not save tracking.");
  }
}
