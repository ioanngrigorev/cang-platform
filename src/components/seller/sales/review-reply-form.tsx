"use client";

import { MessageSquareReply, PencilLine, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button, Field, FormError, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/utils";
import { replyReviewAction } from "@/modules/seller/sales/reviews/actions";

export function ReviewReplyForm({ reviewId, reply, repliedAt, locale, companyName }: { reviewId: string; reply: string | null; repliedAt: string | null; locale: string; companyName: string }) {
  const t = useTranslations("sales.reviews");
  const router = useRouter();
  const [editing, setEditing] = React.useState(!reply);
  const { state, formAction, fieldError } = useActionForm(replyReviewAction, {
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });

  if (reply && !editing) {
    return (
      <div className="mt-3 rounded-lg bg-steel-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-steel-600">
              <MessageSquareReply className="size-3.5" /> {t("replyFrom", { company: companyName })}
              {repliedAt ? <span className="font-normal text-steel-500">· {formatDateTime(repliedAt, locale)}</span> : null}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{reply}</p>
          </div>
          <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <PencilLine /> {t("editReply")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Field label={reply ? t("editReply") : t("reply")} htmlFor={`reply-${reviewId}`} error={fieldError("reply")}>
        <Textarea id={`reply-${reviewId}`} name="reply" rows={3} defaultValue={reply ?? ""} placeholder={t("replyPlaceholder")} maxLength={2000} required />
      </Field>
      <FormError state={state} />
      <div className="flex items-center gap-2">
        <SubmitButton variant="primary" size="sm">
          <Send /> {reply ? t("saveReply") : t("publishReply")}
        </SubmitButton>
        {reply ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
