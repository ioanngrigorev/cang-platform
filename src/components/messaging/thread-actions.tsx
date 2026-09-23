"use client";

import { Archive, ArchiveRestore, Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/buyer/action-form";
import { archiveConversationAction, toggleMuteAction, unarchiveConversationAction } from "@/modules/messaging/actions";

/** Mute / archive controls in the thread header. Each is a one-click server action that refreshes the page. */
export function ThreadActions({ conversationId, status, isMuted, canWrite }: { conversationId: string; status: "OPEN" | "ARCHIVED" | "BLOCKED"; isMuted: boolean; canWrite: boolean }) {
  const t = useTranslations("messaging.thread");
  return (
    <div className="flex items-center gap-1">
      <ActionForm action={toggleMuteAction} hidden={{ conversationId }} label={<span className="hidden sm:inline">{isMuted ? t("unmute") : t("mute")}</span>} icon={isMuted ? <BellOff /> : <Bell />} variant="ghost" size="sm" />
      {canWrite && status !== "BLOCKED" ? (
        status === "ARCHIVED" ? (
          <ActionForm action={unarchiveConversationAction} hidden={{ conversationId }} label={<span className="hidden sm:inline">{t("unarchive")}</span>} icon={<ArchiveRestore />} variant="ghost" size="sm" />
        ) : (
          <ActionForm action={archiveConversationAction} hidden={{ conversationId }} label={<span className="hidden sm:inline">{t("archive")}</span>} icon={<Archive />} variant="ghost" size="sm" />
        )
      ) : null}
    </div>
  );
}
