import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl, googleEnabled, newOAuthState } from "@/modules/auth/google";

export async function GET(req: NextRequest) {
  if (!googleEnabled()) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 404 });
  }
  const state = newOAuthState();
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set("cang_oauth_state", JSON.stringify({ state, next, locale }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
