"use client";

import { Factory, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { FormError, useActionForm } from "@/components/ui/form";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { registerAction } from "@/modules/auth/actions";

export function RegisterForm({ defaultType, next, locale, countries }: { defaultType: "BUYER" | "SELLER"; next?: string; locale: string; countries: Array<{ code: string; name: string }> }) {
  const t = useTranslations("auth.register");
  const [type, setType] = React.useState<"BUYER" | "SELLER">(defaultType);
  const { state, formAction, fieldError } = useActionForm(registerAction);
  const defaultCountry = type === "SELLER" ? "VN" : "US";
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="accountType" value={type} />
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { v: "BUYER", icon: ShoppingBag, label: t("buyer"), hint: t("buyerHint") },
            { v: "SELLER", icon: Factory, label: t("seller"), hint: t("sellerHint") },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setType(o.v)}
            aria-pressed={type === o.v}
            className={cn("rounded-lg border p-3 text-left transition-colors", type === o.v ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900" : "border-steel-200 hover:border-steel-400")}
          >
            <o.icon className={cn("size-5", type === o.v ? "text-ink-900" : "text-steel-400")} />
            <p className="mt-2 text-sm font-semibold text-ink-900">{o.label}</p>
            <p className="mt-0.5 text-xs text-steel-500">{o.hint}</p>
          </button>
        ))}
      </div>
      <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
        <Input id="name" name="name" autoComplete="name" required invalid={!!fieldError("name")} />
      </Field>
      <Field label={t("email")} htmlFor="email" error={fieldError("email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!fieldError("email")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("companyName")} htmlFor="companyName" error={fieldError("companyName")} required>
          <Input id="companyName" name="companyName" autoComplete="organization" required invalid={!!fieldError("companyName")} />
        </Field>
        <Field label={t("country")} htmlFor="countryCode" error={fieldError("countryCode")} required>
          <Select id="countryCode" name="countryCode" key={defaultCountry} defaultValue={defaultCountry} invalid={!!fieldError("countryCode")}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("phone")} htmlFor="phone" error={fieldError("phone")}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+84 …" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("password")} htmlFor="password" error={fieldError("password")} hint={t("passwordHint")} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required invalid={!!fieldError("password")} />
        </Field>
        <Field label={t("confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required invalid={!!fieldError("confirmPassword")} />
        </Field>
      </div>
      <Field error={fieldError("acceptTerms")}>
        <Checkbox
          name="acceptTerms"
          label={t.rich("terms", {
            terms: (c) => (
              <Link href="/legal/terms" className="underline" target="_blank">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/legal/privacy" className="underline" target="_blank">
                {c}
              </Link>
            ),
          })}
        />
      </Field>
      <FormError state={state} />
      <SubmitButton className="w-full" size="lg" variant={type === "SELLER" ? "accent" : "primary"}>
        {t("submit")}
      </SubmitButton>
      <p className="text-center text-sm text-steel-600">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-ink-900 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
