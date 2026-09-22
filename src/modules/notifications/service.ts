import { and, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { companyMembers, notifications, users } from "@/db/schema";
import { emailLayout, sendEmail } from "./email";
import { absoluteUrl } from "@/lib/utils";

export type NotificationType =
  | "RFQ_NEW_MATCH"
  | "RFQ_NEW_QUOTATION"
  | "RFQ_INVITATION"
  | "QUOTATION_ACCEPTED"
  | "QUOTATION_REJECTED"
  | "QUOTATION_REVISED"
  | "MESSAGE_NEW"
  | "ORDER_CREATED"
  | "ORDER_STATUS"
  | "PAYMENT_CREATED"
  | "PAYMENT_PAID"
  | "PAYMENT_RELEASED"
  | "SHIPMENT_UPDATE"
  | "VERIFICATION_STATUS"
  | "PRODUCT_MODERATION"
  | "DISPUTE_UPDATE"
  | "FINANCING_UPDATE"
  | "INSPECTION_UPDATE"
  | "REVIEW_RECEIVED"
  | "TEAM_INVITATION"
  | "SYSTEM";

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string; // path without locale, e.g. "/buyer/rfqs/abc"
  data?: Record<string, unknown>;
  email?: boolean; // also send email (default: true for important types)
};

const EMAIL_BY_DEFAULT: NotificationType[] = [
  "RFQ_NEW_QUOTATION",
  "RFQ_INVITATION",
  "QUOTATION_ACCEPTED",
  "ORDER_CREATED",
  "ORDER_STATUS",
  "PAYMENT_CREATED",
  "PAYMENT_PAID",
  "PAYMENT_RELEASED",
  "VERIFICATION_STATUS",
  "DISPUTE_UPDATE",
  "FINANCING_UPDATE",
  "TEAM_INVITATION",
];

/** Notify a single user (in-app + optional email). Never throws. */
export async function notifyUser(userId: string, input: NotifyInput, tx?: Tx): Promise<void> {
  try {
    const executor = tx ?? db;
    await executor.insert(notifications).values({
      userId,
      type: input.type,
      channel: "IN_APP",
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      data: input.data ?? null,
    });
    const shouldEmail = input.email ?? EMAIL_BY_DEFAULT.includes(input.type);
    if (shouldEmail) {
      const [u] = await executor.select({ email: users.email, locale: users.locale }).from(users).where(eq(users.id, userId)).limit(1);
      if (u?.email) {
        const link = input.link ? absoluteUrl(`/${u.locale || "en"}${input.link}`) : undefined;
        sendEmail({
          to: u.email,
          subject: `[CANG] ${input.title}`,
          html: emailLayout(input.title, `<p>${escapeHtml(input.body ?? "")}</p>`, link ? { label: "Open in CANG", url: link } : undefined),
        }).catch((e) => console.error("[notify] email failed", e));
      }
    }
  } catch (err) {
    console.error("[notify] failed", err);
  }
}

/** Notify every active member of a company. */
export async function notifyCompany(companyId: string, input: NotifyInput, tx?: Tx): Promise<void> {
  const executor = tx ?? db;
  const members = await executor
    .select({ userId: companyMembers.userId })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.status, "ACTIVE")));
  await Promise.all(members.map((m) => notifyUser(m.userId, input, tx)));
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
