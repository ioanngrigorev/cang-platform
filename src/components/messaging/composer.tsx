"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { sendMessageAction } from "@/modules/messaging/actions";
import { AttachmentPicker } from "./attachment-picker";

const MAX_HEIGHT = 220;

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
}

/**
 * Reply box at the bottom of a thread. Enter inserts a newline, Ctrl/Cmd+Enter sends. After a successful
 * send the form and the attachment list reset and the server thread is refreshed (which also scrolls down).
 */
export function Composer({ conversationId, counterpartyName, disabled }: { conversationId: string; counterpartyName: string; disabled?: boolean }) {
  const t = useTranslations("messaging.composer");
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const [uploadKey, setUploadKey] = React.useState(0);
  const { formAction, pending, fieldError } = useActionForm(sendMessageAction, {
    successToast: false,
    onSuccess: () => {
      formRef.current?.reset();
      if (textRef.current) autoGrow(textRef.current);
      setUploadKey((k) => k + 1);
      router.refresh();
      textRef.current?.focus();
    },
  });
  const bodyError = fieldError("body");

  return (
    <form ref={formRef} action={formAction} className="shrink-0 border-t border-hairline bg-surface py-3 pl-16 pr-3 sm:pr-4 lg:px-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Textarea
        ref={textRef}
        name="body"
        rows={1}
        maxLength={8000}
        placeholder={t("placeholder", { name: counterpartyName })}
        aria-label={t("send")}
        disabled={disabled || pending}
        invalid={!!bodyError}
        onInput={(e) => autoGrow(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        className={cn("min-h-[44px] resize-none py-2.5 placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap", bodyError && "mb-1")}
      />
      {bodyError ? (
        <p className="text-xs text-danger-600" role="alert">
          {bodyError}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        <div className={cn("min-w-0 flex-1", disabled && "pointer-events-none opacity-50")}>
          <AttachmentPicker key={uploadKey} name="attachmentIds" max={10} compact />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-steel-400 md:inline">{t("hint")}</span>
          <SubmitButton variant="primary" size="sm" {...(disabled ? { disabled: true } : {})}>
            <Send /> {t("send")}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
