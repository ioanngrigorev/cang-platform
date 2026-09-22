"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireAuth } from "@/modules/auth/current-user";

function revalidate() {
  revalidatePath("/[locale]/buyer/notifications", "page");
  revalidatePath("/[locale]/buyer", "page");
  revalidatePath("/[locale]/seller/notifications", "page");
}

export async function markNotificationReadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(z.object({ notificationId: z.string().min(1) }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, parsed.data.notificationId), eq(notifications.userId, auth.user.id), isNull(notifications.readAt)));
    revalidate();
    return ok(undefined);
  });
}

export async function markAllNotificationsReadAction(_prev: ActionResult<{ count: number }> | null): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const auth = await requireAuth();
    const rows = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, auth.user.id), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    revalidate();
    return ok({ count: rows.length }, rows.length ? `${rows.length} notification(s) marked as read.` : "Nothing to mark.");
  });
}
