"use client";

import { Factory, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FormError, useActionForm } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { enableCapabilityAction, onboardingAction } from "./actions";

export function OnboardingForm({ countries, existing, enable }: { countries: Array<{ code: string; name: string }>; existing: { id: string; name: string; isBuyer: boolean; isSeller: boolean } | null; enable: "BUYER" | "SELLER" | null }) {
  const t = useTranslations("auth");
  const [type, setType] = React.useState<"BUYER" | "SELLER">(enable ?? "BUYER");
  const create = useActionForm(onboardingAction);
  const enableForm = useActionForm(enableCapabilityAction);

  if (existing && enable) {
    return (
      <form action={enableForm.formAction} className="space-y-4">
        <input type="hidden" name="capability" value={enable} />
        <p className="text-sm text-steel-700">
          Enable the <strong>{enable === "SELLER" ? "supplier" : "buyer"}</strong> workspace for <strong>{existing.name}</strong>? Your company can both sell and source on CANG.
        </p>
        <FormError state={enableForm.state} />
        <SubmitButton size="lg" className="w-full">{t("onboarding.submit")}</SubmitButton>
      </form>
    );
  }

  return (
    <form action={create.formAction} className="space-y-4" noValidate>
      <input type="hidden" name="accountType" value={type} />
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { v: "BUYER", icon: ShoppingBag, label: t("register.buyer"), hint: t("register.buyerHint") },
            { v: "SELLER", icon: Factory, label: t("register.seller"), hint: t("register.sellerHint") },
          ] as const
        ).map((o) => (
          <button key={o.v} type="button" onClick={() => setType(o.v)} aria-pressed={type === o.v} className={cn("rounded-lg border p-3 text-left", type === o.v ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900" : "border-steel-200 hover:border-steel-400")}>
            <o.icon className={cn("size-5", type === o.v ? "text-ink-900" : "text-steel-400")} />
            <p className="mt-2 text-sm font-semibold text-ink-900">{o.label}</p>
            <p className="mt-0.5 text-xs text-steel-500">{o.hint}</p>
          </button>
        ))}
      </div>
      <Field label={t("onboarding.companyName")} htmlFor="companyName" error={create.fieldError("companyName")} required>
        <Input id="companyName" name="companyName" required />
      </Field>
      <Field label={t("onboarding.country")} htmlFor="countryCode" error={create.fieldError("countryCode")} required>
        <Select id="countryCode" name="countryCode" key={type} defaultValue={type === "SELLER" ? "VN" : "US"}>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <FormError state={create.state} />
      <SubmitButton size="lg" className="w-full">{t("onboarding.submit")}</SubmitButton>
    </form>
  );
}
