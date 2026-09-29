"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/card";
import { FormError, useActionForm } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction } from "@/modules/auth/actions";

export function ForgotForm() {
  const t = useTranslations("auth");
  const { state, formAction, fieldError } = useActionForm(forgotPasswordAction, { successToast: false });
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label={t("login.email")} htmlFor="email" error={fieldError("email")} required>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <FormError state={state} />
      {state?.ok ? <Alert variant="success">{t("forgot.sent")}</Alert> : null}
      <SubmitButton className="w-full" size="lg">{t("forgot.submit")}</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-ink-700 hover:underline">{t("forgot.back")}</Link>
      </p>
    </form>
  );
}
