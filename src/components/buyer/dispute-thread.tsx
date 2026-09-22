"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Avatar, Button, Field, FormError, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn, formatDateTime } from "@/lib/utils";
import { closeDisputeAction, replyDisputeAction } from "@/modules/disputes/actions";

export type DisputeMessageRow = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string } | null;
  isMine: boolean;
};

export function DisputeThread({ disputeId, messages, locale, closed }: { disputeId: string; messages: DisputeMessageRow[]; locale: string; closed: boolean }) {
  const t = useTranslations("buyer.disputes");
  const router = useRouter();
  const [key, setKey] = React.useState(0);
  const { state, formAction, fieldError } = useActionForm(replyDisputeAction, {
    onSuccess: () => {
      setKey((k) => k + 1);
      router.refresh();
    },
  });

  return (
    <div className="space-y-5">
      <ul className="space-y-4">
        {messages.map((m) => (
          <li key={m.id} className={cn("flex gap-3", m.isMine && "flex-row-reverse")}>
            <Avatar name={m.author?.name ?? "?"} size={32} />
            <div className={cn("max-w-[80%] rounded-lg px-3.5 py-2.5", m.isMine ? "bg-ink-900 text-white" : "bg-steel-100 text-ink-900")}>
              <p className={cn("text-xs font-medium", m.isMine ? "text-steel-300" : "text-steel-500")}>
                {m.isMine ? t("you") : (m.author?.name ?? "—")} · {formatDateTime(m.createdAt, locale)}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {closed ? (
        <p className="rounded-md border border-steel-200 bg-steel-50 px-4 py-3 text-sm text-steel-600">{t("closed")}</p>
      ) : (
        <form key={key} action={formAction} className="space-y-3 border-t border-steel-100 pt-4">
          <input type="hidden" name="disputeId" value={disputeId} />
          <Field label={t("reply")} htmlFor="dispute-body" error={fieldError("body")} required>
            <Textarea id="dispute-body" name="body" rows={4} placeholder={t("replyPlaceholder")} required />
          </Field>
          <FileUpload name="documentIds" scope="dispute" label={t("evidence")} max={5} />
          <FormError state={state} />
          <SubmitButton variant="primary">
            <Send /> {t("send")}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

export function CloseDisputeButton({ disputeId }: { disputeId: string }) {
  const t = useTranslations("buyer.disputes");
  return (
    <DialogForm
      action={closeDisputeAction}
      hidden={{ disputeId }}
      title={t("closeTitle")}
      description={t("closeDescription")}
      submitLabel={t("closeSubmit")}
      trigger={(open) => (
        <Button type="button" variant="secondary" onClick={open}>
          <CheckCircle2 /> {t("close")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <Field label={t("closeResolution")} htmlFor="dispute-resolution" error={fieldError("resolution")}>
          <Textarea id="dispute-resolution" name="resolution" rows={3} />
        </Field>
      )}
    </DialogForm>
  );
}
