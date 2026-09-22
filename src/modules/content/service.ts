import "server-only";
import { db } from "@/db";
import { supportTicketMessages, supportTickets } from "@/db/schema";
import { ticketNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import type { ContactInput } from "./schemas";

/** Create a support ticket from the public contact form (signed-in users only — the ticket needs a requester). */
export async function createSupportTicket(input: ContactInput, ctx: { userId: string; companyId?: string | null }) {
  const ticket = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(supportTickets)
      .values({
        ticketNumber: ticketNumber(),
        requesterId: ctx.userId,
        companyId: ctx.companyId ?? null,
        subject: input.subject,
        category: input.category,
        priority: "normal",
        status: "OPEN",
      })
      .returning();
    await tx.insert(supportTicketMessages).values({ ticketId: t.id, authorId: ctx.userId, body: input.message, isInternal: false });
    return t;
  });
  await audit({ actorId: ctx.userId, action: "support.ticket.create", entityType: "support_ticket", entityId: ticket.id, after: { subject: input.subject, category: input.category } });
  return ticket;
}
