"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert } from "@/components/ui/card";
import { FormError, useActionForm } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/modules/auth/actions";

export function LoginForm({ next, googleEnabled, oauthError, locale }: { next?: string; googleEnabled: boolean; oauthError?: string; locale: string }) {
  const t = useTranslations("auth.login");
  const { state, formAction, fieldError } = useActionForm(loginAction);
  return (
    <div className="space-y-4">
      {oauthError ? <Alert variant="danger">{oauthError === "suspended" ? t("errors.suspended") : t("errors.oauth")}</Alert> : null}
      {googleEnabled ? (
        <>
          <a
            href={`/api/auth/google?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ""}`}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-steel-300 bg-white text-sm font-medium text-ink-900 hover:bg-steel-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {t("google")}
          </a>
          <div className="flex items-center gap-3 text-xs text-steel-400">
            <span className="h-px flex-1 bg-steel-200" />
            {t("or")}
            <span className="h-px flex-1 bg-steel-200" />
          </div>
        </>
      ) : null}
      <form action={formAction} className="space-y-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label={t("email")} htmlFor="email" error={fieldError("email")} required>
          <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!fieldError("email")} placeholder="you@company.com" />
        </Field>
        <Field
          label={
            <span className="flex items-center justify-between">
              {t("password")}
              <Link href="/forgot-password" className="text-xs font-normal text-ink-600 hover:underline">
                {t("forgot")}
              </Link>
            </span>
          }
          htmlFor="password"
          error={fieldError("password")}
          required
        >
          <Input id="password" name="password" type="password" autoComplete="current-password" required invalid={!!fieldError("password")} />
        </Field>
        <FormError state={state} />
        <SubmitButton className="w-full" size="lg">
          {t("submit")}
        </SubmitButton>
      </form>
      <p className="text-center text-sm text-steel-600">
        {t("noAccount")}{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-ink-900 hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
