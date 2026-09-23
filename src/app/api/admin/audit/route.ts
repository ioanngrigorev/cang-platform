import { NextResponse } from "next/server";
import { exportAuditLogs } from "@/modules/admin/audit/queries";
import { csvEscape } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";

export const dynamic = "force-dynamic";

/** CSV export of the audit log with the same filters as /admin/audit (staff with admin.audit.read only). */
export async function GET(req: Request) {
  try {
    await requireAdmin("admin.audit.read");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const get = (k: string) => sp.get(k)?.trim() || undefined;
  const rows = await exportAuditLogs({ action: get("action"), actorType: get("actorType"), entityType: get("entityType"), entityId: get("entityId"), actor: get("actor"), from: get("from"), to: get("to") });
  const header = ["id", "createdAt", "actorType", "actorId", "actorName", "actorEmail", "action", "entityType", "entityId", "ipAddress", "before", "after"];
  const lines = [header.join(",")];
  for (const { log, actorName, actorEmail } of rows) {
    lines.push([log.id, log.createdAt, log.actorType, log.actorId, actorName, actorEmail, log.action, log.entityType, log.entityId, log.ipAddress, log.before, log.after].map(csvEscape).join(","));
  }
  return new NextResponse(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
