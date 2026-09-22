"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormError, FormSuccess, useActionForm } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPasswordAction } from "@/modules/auth/actions";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const { state, formAction, fieldError } = useActionForm(resetPasswordAction);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormSuccess state={state} />
        <Link href="/login" className="text-sm font-medium text-ink-900 hover:underline">{t("reset.goLogin")} →</Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label={t("register.password")} htmlFor="password" error={fieldError("password")} hint={t("register.passwordHint")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label={t("register.confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <FormError state={state} />
      <SubmitButton className="w-full" size="lg">{t("reset.submit")}</SubmitButton>
    </form>
  );
}
