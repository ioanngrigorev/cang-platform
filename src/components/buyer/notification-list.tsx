"use client";

import { Check, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/buyer/action-form";
import { Badge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/modules/notifications/actions";

export type NotificationRow = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

export function MarkAllReadButton() {
  const t = useTranslations("buyer.notifications");
  return <ActionForm action={markAllNotificationsReadAction} label={t("markAllRead")} icon={<CheckCheck />} variant="secondary" size="md" />;
}

export function NotificationList({ rows, locale }: { rows: NotificationRow[]; locale: string }) {
  const t = useTranslations("buyer.notifications");
  return (
    <ul className="divide-y divide-steel-100">
      {rows.map((n) => (
        <li key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.readAt && "bg-brass-50/40")}>
          <div className="min-w-0 flex-1">
            {n.link ? (
              <Link href={n.link} className={cn("text-sm hover:underline", n.readAt ? "text-steel-700" : "font-semibold text-ink-900")}>
                {n.title}
              </Link>
            ) : (
              <p className={cn("text-sm", n.readAt ? "text-steel-700" : "font-semibold text-ink-900")}>{n.title}</p>
            )}
            {n.body ? <p className="mt-0.5 text-sm text-steel-600">{n.body}</p> : null}
            <p className="mt-1 flex items-center gap-2 text-xs text-steel-400">
              <span>{timeAgo(n.createdAt, locale)}</span>
              {!n.readAt ? (
                <Badge variant="brass" size="sm">
                  {t("unread")}
                </Badge>
              ) : null}
            </p>
          </div>
          {!n.readAt ? <ActionForm action={markNotificationReadAction} hidden={{ notificationId: n.id }} label={t("markRead")} icon={<Check />} variant="ghost" size="xs" /> : null}
        </li>
      ))}
    </ul>
  );
}
