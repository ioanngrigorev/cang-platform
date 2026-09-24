import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ActionError } from "@/lib/action";
import { applyShipmentUpdate } from "@/modules/logistics/tracking/service";
import { apiError, authenticatePartnerApi } from "@/modules/partner/api-auth";
import { apiEventSchema, apiShipmentByNumber } from "@/modules/partner/api";

/**
 * POST /api/partner/v1/shipments/{shipment_number}/events — report a status from the partner's TMS.
 * Same rules as the portal (allowed next statuses, reason for problems, receiver for delivery).
 * `external_id` makes retries safe: the same id is applied once.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
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
  const parsed = apiEventSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "Invalid event.", { fields: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const res = await applyShipmentUpdate(
      { kind: "PARTNER", userId: null, companyId: auth.companyId, via: "api" },
      {
        shipmentId: row.shipment.id,
        status: d.status,
        reasonCode: d.reason_code,
        location: d.location,
        description: d.description,
        occurredAt: d.occurred_at,
        receiverName: d.receiver_name,
        podUrl: d.pod_url,
        packages: d.packages,
        grossWeightKg: d.gross_weight_kg,
        vehiclePlate: d.vehicle_plate,
        driverName: d.driver_name,
        driverPhone: d.driver_phone,
        vesselOrFlight: d.vessel_or_flight,
        containerNumber: d.container_number,
        customsDeclaration: d.customs_declaration,
        externalKey: d.external_id ? `API|${auth.providerId}|${d.external_id}` : null,
      },
    );
    return NextResponse.json({ ok: true, duplicate: res.duplicate, status_changed: res.changed }, { status: res.duplicate ? 200 : 201 });
  } catch (err) {
    if (err instanceof ActionError) return apiError(err.code === "NOT_FOUND" ? 404 : 422, err.message, { code: err.code, fields: err.fieldErrors });
    console.error("[partner-api] event", err);
    return apiError(500, "Could not save the event.");
  }
}
