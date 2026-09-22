"use server";

import { type ActionResult, formDataToObject, ok, parseInput, runAction, ActionError } from "@/lib/action";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/modules/auth/current-user";
import { contactSchema } from "./schemas";
import { createSupportTicket } from "./service";

/** Public contact form → support ticket. Requires a signed-in user (anonymous visitors see e-mail/phone instead). */
export async function submitContactAction(_prev: ActionResult<{ ticketNumber: string }> | null, formData: FormData): Promise<ActionResult<{ ticketNumber: string }>> {
  return runAction(async () => {
    const auth = await requireAuth();
    const rl = await rateLimit(`contact:${auth.user.id}`, RATE_LIMITS.rfq);
    if (!rl.allowed) throw new ActionError("Too many messages — please try again later.", "RATE_LIMITED");
    const parsed = parseInput(contactSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const ticket = await createSupportTicket(parsed.data, { userId: auth.user.id, companyId: auth.activeMembership?.companyId ?? null });
    return ok({ ticketNumber: ticket.ticketNumber }, "Message sent");
  });
}
