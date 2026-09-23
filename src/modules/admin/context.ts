import "server-only";
import { revalidatePath } from "next/cache";
import { audit, type AuditInput } from "@/modules/audit/log";
import { requireAdmin } from "@/modules/auth/current-user";
import type { PlatformPermission } from "@/modules/auth/rbac";
import { requestMeta } from "@/modules/auth/session";

/**
 * Resolve the acting staff member for an admin mutation: enforces the permission and returns an
 * audit helper that stamps actorType ADMIN + request metadata on every record.
 */
export async function adminActor(permission: PlatformPermission) {
  const auth = await requireAdmin(permission);
  const meta = await requestMeta();
  const log = (input: Omit<AuditInput, "actorId" | "actorType" | "ipAddress" | "userAgent">) =>
    audit({ ...input, actorId: auth.user.id, actorType: "ADMIN", ipAddress: meta.ip, userAgent: meta.userAgent });
  return { auth, user: auth.user, log };
}

/** Revalidate admin pages (paths are locale-less, e.g. "/admin/users"). */
export function revalidateAdmin(...paths: string[]) {
  for (const p of paths) revalidatePath(`/[locale]${p}`, "page");
}
