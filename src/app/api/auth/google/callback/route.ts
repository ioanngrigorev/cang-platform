import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { authAccounts, companyMembers, users } from "@/db/schema";
import { audit } from "@/modules/audit/log";
import { exchangeGoogleCode, googleEnabled } from "@/modules/auth/google";
import { defaultHomeFor } from "@/modules/auth/redirects";
import { createSession } from "@/modules/auth/session";

export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/en/login?error=oauth", req.url));
  const raw = req.cookies.get("cang_oauth_state")?.value;
  const params = req.nextUrl.searchParams;
  let stored: { state: string; next: string; locale: string } | null = null;
  try {
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  const locale = stored?.locale === "vi" ? "vi" : "en";
  const fail = (code: string) => NextResponse.redirect(new URL(`/${locale}/login?error=${code}`, req.url));

  if (!stored || params.get("state") !== stored.state) return fail("oauth_state");
  const code = params.get("code");
  if (!code) return fail("oauth_denied");

  try {
    const profile = await exchangeGoogleCode(code);
    if (!profile.email || !profile.email_verified) return fail("oauth_email");

    const email = profile.email.toLowerCase();
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    let isNew = false;
    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: profile.name ?? email.split("@")[0],
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: new Date(),
          locale,
          status: "ACTIVE",
        })
        .returning();
      user = created;
      isNew = true;
    }
    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") return fail("suspended");

    await db
      .insert(authAccounts)
      .values({ userId: user.id, provider: "GOOGLE", providerAccountId: profile.sub })
      .onConflictDoNothing();

    await createSession(user.id);
    await audit({ actorId: user.id, action: isNew ? "auth.register.google" : "auth.login.google", entityType: "user", entityId: user.id });

    const membership = await db.query.companyMembers.findFirst({
      where: and(eq(companyMembers.userId, user.id), eq(companyMembers.status, "ACTIVE")),
      with: { company: true },
    });
    const next = stored.next && stored.next.startsWith("/") && !stored.next.startsWith("//") ? stored.next : null;
    const target = next ?? defaultHomeFor(user.platformRole, membership?.company ?? null);
    const res = NextResponse.redirect(new URL(`/${locale}${target}`, req.url));
    res.cookies.set("cang_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    console.error("[google oauth]", err);
    return fail("oauth_failed");
  }
}
