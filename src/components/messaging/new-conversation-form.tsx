"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, Field, FormError, Input, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { startConversationAction } from "@/modules/messaging/actions";
import type { ConversationContext, ConversationSide } from "@/modules/messaging/schemas";
import { AttachmentPicker } from "./attachment-picker";

export type NewConversationFormProps = {
  side: ConversationSide;
  counterpartyCompanyId: string;
  context: ConversationContext;
  productId: string | null;
  rfqId: string | null;
  quotationId: string | null;
  orderId: string | null;
  defaultSubject: string | null;
  cancelHref: string;
};

/** Compact first-message form; the action redirects into the (new or reused) conversation. */
export function NewConversationForm(p: NewConversationFormProps) {
  const t = useTranslations("messaging.new");
  const { state, formAction, fieldError } = useActionForm(startConversationAction, { successToast: false });
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="side" value={p.side} />
      <input type="hidden" name="counterpartyCompanyId" value={p.counterpartyCompanyId} />
      <input type="hidden" name="context" value={p.context} />
      {p.productId ? <input type="hidden" name="productId" value={p.productId} /> : null}
      {p.rfqId ? <input type="hidden" name="rfqId" value={p.rfqId} /> : null}
      {p.quotationId ? <input type="hidden" name="quotationId" value={p.quotationId} /> : null}
      {p.orderId ? <input type="hidden" name="orderId" value={p.orderId} /> : null}
      <Card>
        <CardContent className="space-y-5">
          <Field label={t("subject")} htmlFor="subject" hint={t("optional")} error={fieldError("subject")}>
            <Input id="subject" name="subject" maxLength={200} defaultValue={p.defaultSubject ?? ""} />
          </Field>
          <Field label={t("body")} htmlFor="body" error={fieldError("body")} required>
            <Textarea id="body" name="body" rows={6} maxLength={8000} placeholder={p.side === "buyer" ? t("bodyPlaceholder") : t("bodyPlaceholderSeller")} autoFocus />
          </Field>
          <AttachmentPicker name="attachmentIds" label={t("attachments")} hint={t("attachmentsHint")} max={10} />
        </CardContent>
      </Card>
      <FormError state={state} />
      <div className="flex items-center justify-end gap-2">
        <Button href={p.cancelHref} variant="ghost">
          {t("cancel")}
        </Button>
        <SubmitButton variant="primary">
          <Send /> {t("send")}
        </SubmitButton>
      </div>
    </form>
  );
}
