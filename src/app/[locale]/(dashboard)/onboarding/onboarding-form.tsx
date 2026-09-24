"use client";

import { Factory, ShoppingBag, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FormError, useActionForm } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { enableCapabilityAction, onboardingAction } from "./actions";

type AccountType = "BUYER" | "SELLER" | "LOGISTICS";

export function OnboardingForm({ countries, existing, enable, defaultType = "BUYER", next }: { countries: Array<{ code: string; name: string }>; existing: { id: string; name: string; isBuyer: boolean; isSeller: boolean } | null; enable: "BUYER" | "SELLER" | null; defaultType?: AccountType; next?: string }) {
  const t = useTranslations("auth");
  const [type, setType] = React.useState<AccountType>(enable ?? defaultType);
  const create = useActionForm(onboardingAction);
  const enableForm = useActionForm(enableCapabilityAction);

  if (existing && enable) {
    return (
      <form action={enableForm.formAction} className="space-y-4">
        <input type="hidden" name="capability" value={enable} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <p className="text-sm text-steel-700">
          {t.rich(enable === "SELLER" ? "onboarding.enableSeller" : "onboarding.enableBuyer", { company: existing.name, b: (c) => <strong>{c}</strong> })}
        </p>
        <FormError state={enableForm.state} />
        <SubmitButton size="lg" className="w-full">{t("onboarding.submit")}</SubmitButton>
      </form>
    );
  }

  return (
    <form action={create.formAction} className="space-y-4" noValidate>
      <input type="hidden" name="accountType" value={type} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { v: "BUYER", icon: ShoppingBag, label: t("register.buyer"), hint: t("register.buyerHint") },
            { v: "SELLER", icon: Factory, label: t("register.seller"), hint: t("register.sellerHint") },
            { v: "LOGISTICS", icon: Truck, label: t("register.logistics"), hint: t("register.logisticsHint") },
          ] as const
        ).map((o) => (
          <button key={o.v} type="button" onClick={() => setType(o.v)} aria-pressed={type === o.v} className={cn("rounded-lg border p-3 text-left", o.v === "LOGISTICS" && "col-span-2", type === o.v ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900" : "border-steel-200 hover:border-steel-400")}>
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
        <Select id="countryCode" name="countryCode" key={type} defaultValue={type === "BUYER" ? "US" : "VN"}>
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
