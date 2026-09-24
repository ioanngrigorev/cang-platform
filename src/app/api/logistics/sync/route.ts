import { NextResponse, type NextRequest } from "next/server";
import { shipmentsToSync, syncShipmentTracking } from "@/modules/logistics/tracking/service";

/**
 * Periodic "sync by tracking number" for open GHN / GHTK shipments. Call from cron with
 *   Authorization: Bearer $CRON_SECRET
 * e.g. every 30 minutes: curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://cang.vn/api/logistics/sync
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await shipmentsToSync(40);
  const results: Array<{ id: string; applied?: number; error?: string }> = [];
  for (const s of list) {
    try {
      const r = await syncShipmentTracking(s.id);
      results.push({ id: s.id, applied: r.applied });
    } catch (err) {
      results.push({ id: s.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return NextResponse.json({ checked: list.length, applied: results.reduce((a, r) => a + (r.applied ?? 0), 0), errors: results.filter((r) => r.error).length, results });
}

export const GET = run;
export const POST = run;
