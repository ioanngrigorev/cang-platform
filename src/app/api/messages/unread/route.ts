import { NextResponse } from "next/server";
import { getAuth } from "@/modules/auth/current-user";
import { unreadConversationCount } from "@/modules/messaging/queries";

/** `{ conversations: n }` — conversations with unread messages for the signed-in user's active company. */
export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = auth.activeMembership?.companyId;
  const conversations = companyId ? await unreadConversationCount(companyId, auth.user.id) : 0;
  return NextResponse.json({ conversations }, { headers: { "cache-control": "private, no-store" } });
}
