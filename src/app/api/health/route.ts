import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/** Liveness + the commit this build came from (`version`, set by deploy/update.sh via BUILD_SHA). */
export async function GET() {
  const version = process.env.BUILD_SHA || "unknown";
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up", version, time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ status: "degraded", db: "down", version, error: (err as Error).message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
