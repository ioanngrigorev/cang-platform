"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";
import { FormError, useActionForm } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitContactAction } from "@/modules/content/actions";
import { CONTACT_CATEGORIES } from "@/modules/content/schemas";

/** Support-ticket form for signed-in visitors (anonymous visitors see the contact channels instead). */
export function ContactForm({ userName }: { userName: string }) {
  const t = useTranslations("content.contact");
  const { state, formAction, fieldError } = useActionForm(submitContactAction);

  if (state?.ok) {
    return (
      <Alert variant="success" title={t("sent")}>
        <span className="inline-flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {t("sentBody", { number: state.data.ticketNumber })}
        </span>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-steel-600">{t("formSubtitle", { name: userName })}</p>
      <Field label={t("subject")} htmlFor="subject" error={fieldError("subject")} required>
        <Input id="subject" name="subject" required maxLength={160} placeholder={t("subjectPlaceholder")} />
      </Field>
      <Field label={t("category")} htmlFor="category" error={fieldError("category")}>
        <Select id="category" name="category" defaultValue="general">
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("message")} htmlFor="message" error={fieldError("message")} required>
        <Textarea id="message" name="message" rows={6} required minLength={20} maxLength={5000} placeholder={t("messagePlaceholder")} />
      </Field>
      <FormError state={state} />
      <SubmitButton>{t("send")}</SubmitButton>
    </form>
  );
}
