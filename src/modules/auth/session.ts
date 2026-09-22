import "server-only";
import { createHash, createHmac } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";
import { secureToken } from "@/lib/ids";

export const SESSION_COOKIE = "cang_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000; // extend when older than a day

/** Tokens are stored hashed (HMAC with SESSION_SECRET) — a DB leak does not expose live sessions. */
export function hashSessionToken(token: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(token).digest("hex");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
  const userAgent = h.get("user-agent")?.slice(0, 400) ?? null;
  return { ip, userAgent };
}

export async function createSession(userId: string, activeCompanyId?: string | null) {
  const token = secureToken(32);
  const { ip, userAgent } = await requestMeta();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    tokenHash: hashSessionToken(token),
    userId,
    activeCompanyId: activeCompanyId ?? null,
    ipAddress: ip,
    userAgent,
    expiresAt,
  });
  await db.update(users).set({ lastLoginAt: new Date(), lastLoginIp: ip }).where(eq(users.id, userId));
  await setSessionCookie(token, expiresAt);
  return token;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export type SessionRecord = typeof sessions.$inferSelect;

/** Resolve the session row for the current request (or null). */
export async function getSessionRecord(): Promise<SessionRecord | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  // Sliding expiration (best-effort; never block the request on it).
  if (Date.now() - row.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    db.update(sessions).set({ lastSeenAt: new Date(), expiresAt }).where(eq(sessions.id, row.id)).catch(() => {});
  }
  return row;
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }
  await clearSessionCookie();
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function setActiveCompany(sessionId: string, companyId: string | null) {
  await db.update(sessions).set({ activeCompanyId: companyId }).where(eq(sessions.id, sessionId));
}
