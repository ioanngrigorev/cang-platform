"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyUser } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { changeRoleSchema, userIdSchema, userStatusSchema } from "./schemas";

const ELEVATED = ["ADMIN", "SUPER_ADMIN"];

async function loadUser(userId: string) {
  const [u] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
  if (!u) throw new ActionError("User not found.", "NOT_FOUND");
  return u;
}

function revalidate(userId: string) {
  revalidateAdmin("/admin/users", `/admin/users/${userId}`, "/admin");
}

export async function changePlatformRoleAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user: actor, log } = await adminActor("admin.users.write");
    const parsed = parseInput(changeRoleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const target = await loadUser(parsed.data.userId);
    if (target.id === actor.id) throw new ActionError("You cannot change your own role.", "FORBIDDEN");
    const touchesElevated = ELEVATED.includes(parsed.data.role) || ELEVATED.includes(target.platformRole);
    if (touchesElevated && actor.platformRole !== "SUPER_ADMIN") throw new ActionError("Only a super admin can grant or revoke ADMIN / SUPER_ADMIN.", "FORBIDDEN");
    if (target.platformRole === parsed.data.role) return ok(undefined, "Role unchanged.");
    await db.update(users).set({ platformRole: parsed.data.role }).where(eq(users.id, target.id));
    await log({ action: "admin.user.role", entityType: "user", entityId: target.id, before: { platformRole: target.platformRole }, after: { platformRole: parsed.data.role } });
    await notifyUser(target.id, { type: "SYSTEM", title: "Your platform role was updated", body: `Your account role is now ${parsed.data.role.replace(/_/g, " ").toLowerCase()}.`, email: false });
    revalidate(target.id);
    return ok(undefined, "Role updated.");
  });
}

export async function setUserStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user: actor, log } = await adminActor("admin.users.write");
    const parsed = parseInput(userStatusSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const target = await loadUser(parsed.data.userId);
    if (target.id === actor.id) throw new ActionError("You cannot suspend your own account.", "FORBIDDEN");
    if (ELEVATED.includes(target.platformRole) && actor.platformRole !== "SUPER_ADMIN") throw new ActionError("Only a super admin can suspend an administrator.", "FORBIDDEN");
    const suspending = parsed.data.status === "SUSPENDED";
    await db.transaction(async (tx) => {
      await tx.update(users).set({ status: parsed.data.status }).where(eq(users.id, target.id));
      if (suspending) await tx.delete(sessions).where(eq(sessions.userId, target.id));
    });
    await log({ action: suspending ? "admin.user.suspend" : "admin.user.reactivate", entityType: "user", entityId: target.id, before: { status: target.status }, after: { status: parsed.data.status, reason: parsed.data.reason } });
    await notifyUser(target.id, {
      type: "SYSTEM",
      title: suspending ? "Your account has been suspended" : "Your account has been reactivated",
      body: parsed.data.reason ?? undefined,
      email: true,
    });
    revalidate(target.id);
    return ok(undefined, suspending ? "User suspended and signed out everywhere." : "User reactivated.");
  });
}

export async function forceLogoutAction(_prev: ActionResult<{ sessions: number }> | null, formData: FormData): Promise<ActionResult<{ sessions: number }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.users.write");
    const parsed = parseInput(userIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const target = await loadUser(parsed.data.userId);
    const deleted = await db.delete(sessions).where(eq(sessions.userId, target.id)).returning({ id: sessions.id });
    await log({ action: "admin.user.force_logout", entityType: "user", entityId: target.id, after: { sessions: deleted.length } });
    await notifyUser(target.id, { type: "SYSTEM", title: "You were signed out of all devices", body: "A platform administrator ended your active sessions. Sign in again to continue.", email: false });
    revalidate(target.id);
    return ok({ sessions: deleted.length }, `${deleted.length} session(s) ended.`);
  });
}
