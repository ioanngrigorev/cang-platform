import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { priorityVariant } from "@/components/admin/badges";
import { TicketAdminActions, TicketReplyForm } from "@/components/admin/support-actions";
import { Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDateTime } from "@/lib/utils";
import { getAdminTicket, staffOptions } from "@/modules/admin/support/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";
import { isStaff } from "@/modules/auth/rbac";

export const metadata: Metadata = { title: "Ticket", robots: { index: false } };

export default async function AdminTicketPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.support.write");
  const t = await getTranslations("admin.support");
  const [ticket, staff] = await Promise.all([getAdminTicket(id), staffOptions()]);
  if (!ticket) notFound();
  const canWrite = canPlatform(auth, "admin.support.write");

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/support" }, { label: ticket.ticketNumber }]}
        eyebrow={`${ticket.ticketNumber} · ${ticket.category}`}
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} label={t(`statuses.${ticket.status}`)} />
            <Badge variant={priorityVariant(ticket.priority)}>{t(`priorities.${ticket.priority}`)}</Badge>
            <span>{formatDateTime(ticket.createdAt, locale)}</span>
          </span>
        }
        actions={<TicketAdminActions ticketId={ticket.id} status={ticket.status} priority={ticket.priority} assigneeId={ticket.assigneeId} currentUserId={auth.user.id} staff={staff.map((s) => ({ id: s.id, name: `${s.name} (${s.platformRole.toLowerCase()})` }))} canWrite={canWrite} />}
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("thread")} />
            <CardContent className="space-y-4">
              <ol className="space-y-3">
                {ticket.messages.map((m) => {
                  const staffMsg = isStaff(m.author.platformRole);
                  return (
                    <li key={m.id} className={cn("rounded-md border p-3 text-sm", m.isInternal ? "border-warning-100 bg-warning-50" : staffMsg ? "border-brand-100 bg-brand-50/40" : "border-hairline bg-surface")}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-steel-500">
                        <span className="font-medium text-ink-900">{m.author.name}</span>
                        <Badge size="sm" variant={staffMsg ? "ink" : "neutral"}>
                          {staffMsg ? t("staff") : t("requester")}
                        </Badge>
                        {m.isInternal ? (
                          <span className="inline-flex items-center gap-1 text-warning-700">
                            <Lock className="size-3" /> {t("internalNote")}
                          </span>
                        ) : null}
                        <span className="ml-auto">{formatDateTime(m.createdAt, locale)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ink-900">{m.body}</p>
                    </li>
                  );
                })}
              </ol>
              {canWrite ? <TicketReplyForm ticketId={ticket.id} disabled={ticket.status === "CLOSED"} /> : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("requester")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("requester"), value: <Link href={`/admin/users/${ticket.requester.id}`} className="font-medium hover:underline">{ticket.requester.name}</Link> },
                  { label: t("email"), value: ticket.requester.email },
                  { label: t("company"), value: ticket.company ? <Link href={`/admin/companies/${ticket.company.id}`} className="hover:underline">{ticket.company.name}</Link> : "—" },
                  { label: t("colAssignee"), value: ticket.assignee?.name ?? t("unassigned") },
                  { label: t("locale"), value: ticket.requester.locale.toUpperCase() },
                  { label: t("colUpdated"), value: formatDateTime(ticket.updatedAt, locale) },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
