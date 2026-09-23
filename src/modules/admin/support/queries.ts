import "server-only";
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { companies, supportTicketMessages, supportTickets, users } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type TicketTab = "open" | "pending" | "resolved" | "closed" | "all";
export const TICKET_TABS: TicketTab[] = ["open", "pending", "resolved", "closed", "all"];
export const TICKET_STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const requester = alias(users, "requester");
const assignee = alias(users, "assignee");

function conds(f: { tab: TicketTab; q?: string; priority?: string }): SQL[] {
  const out: SQL[] = [];
  if (f.tab !== "all") out.push(eq(supportTickets.status, f.tab.toUpperCase()));
  if (f.priority) out.push(eq(supportTickets.priority, f.priority));
  if (f.q) out.push(or(ilike(supportTickets.subject, `%${f.q}%`), ilike(supportTickets.ticketNumber, `%${f.q}%`), ilike(requester.name, `%${f.q}%`), ilike(requester.email, `%${f.q}%`))!);
  return out;
}

export async function listTickets(f: { tab: TicketTab; q?: string; priority?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const c = conds(f);
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        requester: { id: requester.id, name: requester.name, email: requester.email },
        assignee: { id: assignee.id, name: assignee.name },
        company: { id: companies.id, name: companies.name },
      })
      .from(supportTickets)
      .innerJoin(requester, eq(requester.id, supportTickets.requesterId))
      .leftJoin(assignee, eq(assignee.id, supportTickets.assigneeId))
      .leftJoin(companies, eq(companies.id, supportTickets.companyId))
      .where(where)
      .orderBy(desc(supportTickets.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(supportTickets).innerJoin(requester, eq(requester.id, supportTickets.requesterId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function ticketTabCounts(): Promise<Record<TicketTab, number>> {
  const rows = await db.select({ status: supportTickets.status, n: count() }).from(supportTickets).groupBy(supportTickets.status);
  const by = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
  return { open: by("OPEN"), pending: by("PENDING"), resolved: by("RESOLVED"), closed: by("CLOSED"), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function getAdminTicket(id: string) {
  return db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, id),
    with: {
      requester: { columns: { id: true, name: true, email: true, platformRole: true, locale: true } },
      assignee: { columns: { id: true, name: true } },
      company: { columns: { id: true, name: true, isSeller: true, isBuyer: true } },
      messages: { with: { author: { columns: { id: true, name: true, platformRole: true } } }, orderBy: [supportTicketMessages.createdAt] },
    },
  });
}

export async function staffOptions() {
  return db
    .select({ id: users.id, name: users.name, platformRole: users.platformRole })
    .from(users)
    .where(and(inArray(users.platformRole, ["SUPPORT", "MODERATOR", "FINANCE", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE")))
    .orderBy(users.name);
}
