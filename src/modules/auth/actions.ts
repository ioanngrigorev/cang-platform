"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/db";
import { users, verificationTokens, companyMembers } from "@/db/schema";
import { fail, ok, parseInput, runAction, type ActionResult, UnauthorizedError } from "@/lib/action";
import { secureToken } from "@/lib/ids";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { audit } from "@/modules/audit/log";
import { createCompanyForUser } from "@/modules/companies/service";
import { emailLayout, sendEmail } from "@/modules/notifications/email";
import { getAuth, requireAuth } from "./current-user";
import { defaultHomeFor } from "./redirects";
import { hashPassword, verifyPassword } from "./password";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schemas";
import { createSession, destroyAllSessions, destroyCurrentSession, requestMeta, setActiveCompany, sha256 } from "./session";

function safeNext(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = parseInput(loginSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    const { email, password, next } = parsed.data;
    const { ip } = await requestMeta();
    const rl = await rateLimit(`login:${ip ?? "unknown"}:${email}`, RATE_LIMITS.login);
    if (!rl.allowed) return fail("Too many attempts. Please try again in a few minutes.", { code: "RATE_LIMITED" });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid || user.deletedAt) {
      await audit({ action: "auth.login.failed", entityType: "user", entityId: user?.id ?? null, after: { email }, ipAddress: ip });
      return fail("Incorrect email or password.", { code: "INVALID_CREDENTIALS" });
    }
    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return fail("This account is suspended. Contact support@cang.vn.", { code: "SUSPENDED" });
    }
    await createSession(user.id);
    await audit({ actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id, ipAddress: ip });

    const membership = await db.query.companyMembers.findFirst({
      where: and(eq(companyMembers.userId, user.id), eq(companyMembers.status, "ACTIVE")),
      with: { company: true },
      orderBy: (m, { desc }) => [desc(m.isPrimary)],
    });
    const locale = await getLocale();
    redirect({ href: safeNext(next, defaultHomeFor(user.platformRole, membership?.company ?? null)), locale });
    return ok(undefined);
  });
}

export async function registerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = parseInput(registerSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    const input = parsed.data;
    const { ip } = await requestMeta();
    const rl = await rateLimit(`register:${ip ?? "unknown"}`, RATE_LIMITS.register);
    if (!rl.allowed) return fail("Too many registrations from this network. Please try later.", { code: "RATE_LIMITED" });

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) return fail("An account with this email already exists.", { fieldErrors: { email: ["Email already registered"] } });

    const locale = await getLocale();
    const user = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          passwordHash: await hashPassword(input.password),
          locale,
          status: "ACTIVE",
        })
        .returning();
      await createCompanyForUser(
        { name: input.companyName, countryCode: input.countryCode, accountType: input.accountType, ownerUserId: u.id },
        tx,
      );
      return u;
    });

    // Email verification token (verification is encouraged, not blocking, for MVP).
    const token = secureToken(24);
    await db.insert(verificationTokens).values({
      userId: user.id,
      identifier: user.email,
      tokenHash: sha256(token),
      purpose: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });
    const verifyUrl = absoluteUrl(`/${locale}/verify-email?token=${token}`);
    sendEmail({
      to: user.email,
      subject: "Welcome to CANG — confirm your email",
      html: emailLayout(
        "Welcome to CANG",
        `<p>Hi ${user.name},</p><p>Your ${input.accountType === "SELLER" ? "supplier" : "buyer"} account for <strong>${input.companyName}</strong> is ready. Please confirm your email address to unlock all features.</p>`,
        { label: "Confirm email", url: verifyUrl },
      ),
    }).catch(() => {});

    await createSession(user.id);
    await audit({ actorId: user.id, action: "auth.register", entityType: "user", entityId: user.id, after: { accountType: input.accountType }, ipAddress: ip });
    redirect({ href: safeNext(input.next, input.accountType === "SELLER" ? "/seller?welcome=1" : "/buyer?welcome=1"), locale });
    return ok(undefined);
  });
}

export async function logoutAction(): Promise<void> {
  const auth = await getAuth();
  await destroyCurrentSession();
  if (auth) await audit({ actorId: auth.user.id, action: "auth.logout", entityType: "user", entityId: auth.user.id });
  const locale = await getLocale();
  redirect({ href: "/", locale });
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = parseInput(forgotPasswordSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    const { ip } = await requestMeta();
    const rl = await rateLimit(`pwreset:${ip ?? "unknown"}`, RATE_LIMITS.passwordReset);
    if (!rl.allowed) return fail("Too many requests. Please try later.", { code: "RATE_LIMITED" });
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    // Always respond success to avoid account enumeration.
    if (user) {
      const token = secureToken(24);
      await db.insert(verificationTokens).values({
        userId: user.id,
        identifier: user.email,
        tokenHash: sha256(token),
        purpose: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const locale = await getLocale();
      const url = absoluteUrl(`/${locale}/reset-password?token=${token}`);
      await sendEmail({
        to: user.email,
        subject: "Reset your CANG password",
        html: emailLayout("Reset your password", `<p>We received a request to reset the password for ${user.email}. This link expires in 1 hour.</p>`, {
          label: "Choose a new password",
          url,
        }),
      });
    }
    return ok(undefined, "If an account exists for that email, we've sent password reset instructions.");
  });
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = parseInput(resetPasswordSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    const tokenHash = sha256(parsed.data.token);
    const [row] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.purpose, "PASSWORD_RESET"),
          isNull(verificationTokens.consumedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row?.userId) return fail("This reset link is invalid or has expired.", { code: "INVALID_TOKEN" });
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, row.userId!));
      await tx.update(verificationTokens).set({ consumedAt: new Date() }).where(eq(verificationTokens.id, row.id));
    });
    await destroyAllSessions(row.userId);
    await audit({ actorId: row.userId, action: "auth.password.reset", entityType: "user", entityId: row.userId });
    return ok(undefined, "Your password has been updated. You can now sign in.");
  });
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  return runAction(async () => {
    const [row] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, sha256(token)),
          eq(verificationTokens.purpose, "EMAIL_VERIFICATION"),
          isNull(verificationTokens.consumedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row?.userId) return fail("This verification link is invalid or has expired.");
    await db.transaction(async (tx) => {
      await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId!));
      await tx.update(verificationTokens).set({ consumedAt: new Date() }).where(eq(verificationTokens.id, row.id));
    });
    return ok(undefined, "Email confirmed. Thank you!");
  });
}

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(changePasswordSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    if (!(await verifyPassword(parsed.data.currentPassword, auth.user.passwordHash))) {
      return fail("Current password is incorrect.", { fieldErrors: { currentPassword: ["Incorrect password"] } });
    }
    await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, auth.user.id));
    await audit({ actorId: auth.user.id, action: "auth.password.change", entityType: "user", entityId: auth.user.id });
    return ok(undefined, "Password updated.");
  });
}

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(updateProfileSchema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    await db
      .update(users)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
        ...(parsed.data.timezone ? { timezone: parsed.data.timezone } : {}),
      })
      .where(eq(users.id, auth.user.id));
    return ok(undefined, "Profile updated.");
  });
}

/** Switch the company the user is acting for (multi-company users). */
export async function switchCompanyAction(companyId: string): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const m = auth.memberships.find((x) => x.companyId === companyId);
    if (!m) throw new UnauthorizedError("You are not a member of that company.");
    await setActiveCompany(auth.sessionId, companyId);
    const locale = await getLocale();
    redirect({ href: m.company.isSeller ? "/seller" : "/buyer", locale });
    return ok(undefined);
  });
}
