"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload, type UploadedDocument } from "@/components/buyer/file-upload";
import { Avatar, Card, CardContent, CardHeader, Field, FormError, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { updateBuyerCompanyAction } from "@/modules/company-profile/buyer-actions";
import { BUYER_BUSINESS_TYPES, EMPLOYEE_RANGES } from "@/modules/company-profile/buyer-schemas";
import { INCOTERMS } from "@/modules/rfq/schemas";

export type CategoryChoice = { id: string; slug: string; label: string };

export function CompanyForm({
  countries,
  categories,
  defaults,
}: {
  countries: Array<{ code: string; name: string }>;
  categories: CategoryChoice[];
  defaults: {
    name: string;
    legalName: string | null;
    businessType: string;
    countryCode: string;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    taxId: string | null;
    registrationNumber: string | null;
    yearEstablished: number | null;
    employeeRange: string | null;
    tagline: string | null;
    description: string | null;
    logoUrl: string | null;
    sourcingCategories: string[];
    destinationCountries: string[];
    preferredIncoterms: string[];
    preferredCurrency: string;
    annualPurchasingVolumeUsd: number | null;
    companySizeNote: string | null;
  };
}) {
  const t = useTranslations("buyer.company");
  const router = useRouter();
  const [logo, setLogo] = React.useState<UploadedDocument[]>([]);
  const [cats, setCats] = React.useState<string[]>(defaults.sourcingCategories);
  const [dests, setDests] = React.useState<string[]>(defaults.destinationCountries);
  const [incoterms, setIncoterms] = React.useState<string[]>(defaults.preferredIncoterms);
  const { state, formAction, fieldError } = useActionForm(updateBuyerCompanyAction, { onSuccess: () => router.refresh() });

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-steel-700 hover:bg-steel-50");

  return (
    <form action={formAction} className="space-y-5">
      {cats.map((c) => (
        <input key={c} type="hidden" name="sourcingCategories[]" value={c} />
      ))}
      {dests.map((c) => (
        <input key={c} type="hidden" name="destinationCountries[]" value={c} />
      ))}
      {incoterms.map((c) => (
        <input key={c} type="hidden" name="preferredIncoterms[]" value={c} />
      ))}

      <Card>
        <CardHeader title={t("identity")} />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar src={logo[0]?.url ?? defaults.logoUrl} name={defaults.name} size={72} square />
            <div className="min-w-[220px] flex-1">
              <FileUpload name="logoDocumentId" scope="company" label={t("logo")} hint={t("logoHint")} accept="image/*" multiple={false} max={1} visibility="PUBLIC" onChange={setLogo} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label={t("legalName")} htmlFor="legalName" error={fieldError("legalName")}>
              <Input id="legalName" name="legalName" defaultValue={defaults.legalName ?? ""} />
            </Field>
            <Field label={t("businessType")} htmlFor="businessType" error={fieldError("businessType")} required>
              <Select id="businessType" name="businessType" defaultValue={BUYER_BUSINESS_TYPES.includes(defaults.businessType as (typeof BUYER_BUSINESS_TYPES)[number]) ? defaults.businessType : "IMPORTER"}>
                {BUYER_BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {t(`businessTypes.${b}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("employeeRange")} htmlFor="employeeRange" error={fieldError("employeeRange")}>
              <Select id="employeeRange" name="employeeRange" defaultValue={defaults.employeeRange ?? ""}>
                <option value="">{t("employeeRangeNone")}</option>
                {EMPLOYEE_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {t(`employeeRanges.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("tagline")} htmlFor="tagline" error={fieldError("tagline")}>
            <Input id="tagline" name="tagline" defaultValue={defaults.tagline ?? ""} placeholder={t("taglinePlaceholder")} />
          </Field>
          <Field label={t("about")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={5} defaultValue={defaults.description ?? ""} placeholder={t("aboutPlaceholder")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("contact")} />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t("website")} htmlFor="website" error={fieldError("website")}>
            <Input id="website" name="website" defaultValue={defaults.website ?? ""} placeholder="https://" />
          </Field>
          <Field label={t("email")} htmlFor="email" error={fieldError("email")}>
            <Input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} />
          </Field>
          <Field label={t("phone")} htmlFor="phone" error={fieldError("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults.phone ?? ""} />
          </Field>
          <Field label={t("country")} htmlFor="countryCode" error={fieldError("countryCode")} required>
            <Select id="countryCode" name="countryCode" defaultValue={defaults.countryCode} required>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("address")} htmlFor="address" error={fieldError("address")} className="sm:col-span-2">
            <Input id="address" name="address" defaultValue={defaults.address ?? ""} />
          </Field>
          <Field label={t("city")} htmlFor="city" error={fieldError("city")}>
            <Input id="city" name="city" defaultValue={defaults.city ?? ""} />
          </Field>
          <Field label={t("postalCode")} htmlFor="postalCode" error={fieldError("postalCode")}>
            <Input id="postalCode" name="postalCode" defaultValue={defaults.postalCode ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("registration")} />
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={t("taxId")} htmlFor="taxId" error={fieldError("taxId")}>
            <Input id="taxId" name="taxId" defaultValue={defaults.taxId ?? ""} />
          </Field>
          <Field label={t("registrationNumber")} htmlFor="registrationNumber" error={fieldError("registrationNumber")}>
            <Input id="registrationNumber" name="registrationNumber" defaultValue={defaults.registrationNumber ?? ""} />
          </Field>
          <Field label={t("yearEstablished")} htmlFor="yearEstablished" error={fieldError("yearEstablished")}>
            <Input id="yearEstablished" name="yearEstablished" type="number" min={1800} max={new Date().getFullYear()} defaultValue={defaults.yearEstablished ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("sourcing")} description={t("sourcingHint")} />
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("sourcingCategories")}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={cats.includes(c.slug)} onClick={() => toggle(cats, setCats, c.slug)} className={chip(cats.includes(c.slug))}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("destinationCountries")}</p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-steel-200 p-2">
              {countries.map((c) => (
                <button key={c.code} type="button" aria-pressed={dests.includes(c.code)} onClick={() => toggle(dests, setDests, c.code)} className={chip(dests.includes(c.code))}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("preferredIncoterms")}</p>
            <div className="flex flex-wrap gap-2">
              {INCOTERMS.map((i) => (
                <button key={i} type="button" aria-pressed={incoterms.includes(i)} onClick={() => toggle(incoterms, setIncoterms, i)} className={chip(incoterms.includes(i))}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("preferredCurrency")} htmlFor="preferredCurrency" error={fieldError("preferredCurrency")}>
              <Select id="preferredCurrency" name="preferredCurrency" defaultValue={defaults.preferredCurrency}>
                {["USD", "VND", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("annualVolume")} htmlFor="annualPurchasingVolumeUsd" error={fieldError("annualPurchasingVolumeUsd")}>
              <Input id="annualPurchasingVolumeUsd" name="annualPurchasingVolumeUsd" inputMode="decimal" defaultValue={defaults.annualPurchasingVolumeUsd ?? ""} />
            </Field>
          </div>
          <Field label={t("sizeNote")} htmlFor="companySizeNote" error={fieldError("companySizeNote")}>
            <Textarea id="companySizeNote" name="companySizeNote" rows={3} defaultValue={defaults.companySizeNote ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end">
        <SubmitButton variant="primary">{t("save")}</SubmitButton>
      </div>
    </form>
  );
}
