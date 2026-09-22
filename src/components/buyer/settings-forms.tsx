"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, Field, FormError, Input, Select, SubmitButton, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { changePasswordAction, updateProfileAction } from "@/modules/auth/actions";

export function ProfileForm({ defaults }: { defaults: { name: string; email: string; phone: string | null; locale: string; timezone: string } }) {
  const t = useTranslations("buyer.settings");
  const router = useRouter();
  const { state, formAction, fieldError } = useActionForm(updateProfileAction, { onSuccess: () => router.refresh() });

  return (
    <Card>
      <CardHeader title={t("profile")} />
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label={t("email")} htmlFor="email" hint={t("emailHint")}>
              <Input id="email" defaultValue={defaults.email} disabled />
            </Field>
            <Field label={t("phone")} htmlFor="phone" error={fieldError("phone")}>
              <Input id="phone" name="phone" defaultValue={defaults.phone ?? ""} />
            </Field>
            <Field label={t("language")} htmlFor="locale" error={fieldError("locale")}>
              <Select id="locale" name="locale" defaultValue={defaults.locale}>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </Select>
            </Field>
            <Field label={t("timezone")} htmlFor="timezone" error={fieldError("timezone")}>
              <Input id="timezone" name="timezone" defaultValue={defaults.timezone} />
            </Field>
          </div>
          <FormError state={state} />
          <SubmitButton variant="primary">{t("saveProfile")}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const t = useTranslations("buyer.settings");
  const { state, formAction, fieldError } = useActionForm(changePasswordAction);

  return (
    <Card>
      <CardHeader title={t("password")} />
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("currentPassword")} htmlFor="currentPassword" error={fieldError("currentPassword")} required>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label={t("newPassword")} htmlFor="password" error={fieldError("password")} required>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label={t("confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")} required>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
            </Field>
          </div>
          <FormError state={state} />
          <SubmitButton variant="secondary">{t("changePassword")}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
