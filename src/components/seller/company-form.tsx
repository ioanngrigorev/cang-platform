"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload, type UploadedDocument } from "@/components/buyer/file-upload";
import { Avatar, Button, Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SmartImage, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { updateSellerCompanyAction } from "@/modules/seller/company/actions";
import { EMPLOYEE_RANGES, LANGUAGES, PAYMENT_TERMS, SELLER_BUSINESS_TYPES } from "@/modules/seller/company/schemas";
import { INCOTERMS } from "@/modules/rfq/schemas";
import { preservingSubmit } from "./preserving-submit";

export type SellerCompanyDefaults = {
  name: string;
  nameVi: string | null;
  legalName: string | null;
  businessType: string;
  employeeRange: string | null;
  yearEstablished: number | null;
  tagline: string | null;
  taglineVi: string | null;
  description: string | null;
  descriptionVi: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  provinceId: string | null;
  countryCode: string;
  taxId: string | null;
  registrationNumber: string | null;
  languages: string[];
  industryIds: string[];
  primaryIndustryId: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  oemCapable: boolean;
  odmCapable: boolean;
  privateLabelCapable: boolean;
  minOrderValueUsd: number | null;
  avgLeadTimeDays: number | null;
  sampleLeadTimeDays: number | null;
  exportCountries: string[];
  mainMarkets: string[];
  exportPercentage: number | null;
  exportExperienceYears: number | null;
  paymentTermsAccepted: string[];
  acceptedIncoterms: string[];
  factoryTourAvailable: boolean;
};

export function SellerCompanyForm({
  countries,
  provinces,
  industries,
  defaults,
}: {
  countries: Array<{ code: string; name: string }>;
  provinces: Array<{ id: string; name: string; region: string | null }>;
  industries: Array<{ id: string; name: string }>;
  defaults: SellerCompanyDefaults;
}) {
  const t = useTranslations("seller.company");
  const router = useRouter();
  const [logo, setLogo] = React.useState<UploadedDocument[]>([]);
  const [cover, setCover] = React.useState<UploadedDocument[]>([]);
  const [countryCode, setCountryCode] = React.useState(defaults.countryCode);
  const [inds, setInds] = React.useState<string[]>(defaults.industryIds);
  const [primary, setPrimary] = React.useState<string | null>(defaults.primaryIndustryId);
  const [langs, setLangs] = React.useState<string[]>(defaults.languages);
  const [terms, setTerms] = React.useState<string[]>(defaults.paymentTermsAccepted);
  const [incoterms, setIncoterms] = React.useState<string[]>(defaults.acceptedIncoterms);
  const { state, formAction, fieldError, pending } = useActionForm(updateSellerCompanyAction, { onSuccess: () => router.refresh() });

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-ink-900 bg-ink-900 text-paper" : "border-steel-300 bg-white text-steel-700 hover:bg-steel-50");
  const coverUrl = cover[0]?.url ?? defaults.coverUrl;

  return (
    <form action={formAction} onSubmit={preservingSubmit(formAction)} className="space-y-5">
      {inds.map((c) => (
        <input key={c} type="hidden" name="industryIds[]" value={c} />
      ))}
      {langs.map((c) => (
        <input key={c} type="hidden" name="languages[]" value={c} />
      ))}
      {terms.map((c) => (
        <input key={c} type="hidden" name="paymentTermsAccepted[]" value={c} />
      ))}
      {incoterms.map((c) => (
        <input key={c} type="hidden" name="acceptedIncoterms[]" value={c} />
      ))}
      {primary ? <input type="hidden" name="primaryIndustryId" value={primary} /> : null}

      <Card>
        <CardHeader title={t("identity")} description={t("identityHint")} />
        <CardContent className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <Avatar src={logo[0]?.url ?? defaults.logoUrl} name={defaults.name} size={72} square />
            <div className="min-w-0">
              <FileUpload name="logoDocumentId" scope="company" label={t("logo")} hint={t("logoHint")} accept="image/*" multiple={false} max={1} visibility="PUBLIC" onChange={setLogo} />
            </div>
          </div>
          <div className="space-y-2">
            {coverUrl ? (
              <div className="relative h-32 overflow-hidden rounded-md border border-steel-200 bg-steel-50 sm:h-40">
                <SmartImage src={coverUrl} alt={t("cover")} fill fallbackLabel={defaults.name} />
              </div>
            ) : null}
            <FileUpload name="coverDocumentId" scope="company" label={t("cover")} hint={t("coverHint")} accept="image/*" multiple={false} max={1} visibility="PUBLIC" onChange={setCover} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label={t("nameVi")} htmlFor="nameVi" error={fieldError("nameVi")}>
              <Input id="nameVi" name="nameVi" defaultValue={defaults.nameVi ?? ""} />
            </Field>
            <Field label={t("legalName")} htmlFor="legalName" error={fieldError("legalName")}>
              <Input id="legalName" name="legalName" defaultValue={defaults.legalName ?? ""} />
            </Field>
            <Field label={t("businessType")} htmlFor="businessType" error={fieldError("businessType")} required>
              <Select id="businessType" name="businessType" defaultValue={SELLER_BUSINESS_TYPES.includes(defaults.businessType as (typeof SELLER_BUSINESS_TYPES)[number]) ? defaults.businessType : "MANUFACTURER"}>
                {SELLER_BUSINESS_TYPES.map((b) => (
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
            <Field label={t("yearEstablished")} htmlFor="yearEstablished" error={fieldError("yearEstablished")}>
              <Input id="yearEstablished" name="yearEstablished" type="number" min={1800} max={new Date().getFullYear()} defaultValue={defaults.yearEstablished ?? ""} />
            </Field>
            <Field label={t("tagline")} htmlFor="tagline" error={fieldError("tagline")}>
              <Input id="tagline" name="tagline" defaultValue={defaults.tagline ?? ""} placeholder={t("taglinePlaceholder")} maxLength={200} />
            </Field>
            <Field label={t("taglineVi")} htmlFor="taglineVi" error={fieldError("taglineVi")}>
              <Input id="taglineVi" name="taglineVi" defaultValue={defaults.taglineVi ?? ""} maxLength={200} />
            </Field>
          </div>
          <Field label={t("about")} htmlFor="description" error={fieldError("description")} hint={t("aboutHint")}>
            <Textarea id="description" name="description" rows={6} defaultValue={defaults.description ?? ""} placeholder={t("aboutPlaceholder")} />
          </Field>
          <Field label={t("aboutVi")} htmlFor="descriptionVi" error={fieldError("descriptionVi")}>
            <Textarea id="descriptionVi" name="descriptionVi" rows={4} defaultValue={defaults.descriptionVi ?? ""} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("industries")}</p>
            <p className="mb-2 text-xs text-steel-500">{t("industriesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {industries.map((i) => (
                <button key={i.id} type="button" aria-pressed={inds.includes(i.id)} onClick={() => toggle(inds, setInds, i.id)} className={chip(inds.includes(i.id))}>
                  {i.name}
                </button>
              ))}
            </div>
            {inds.length > 1 ? (
              <Field label={t("primaryIndustry")} htmlFor="primaryIndustry" className="mt-3 max-w-sm">
                <Select id="primaryIndustry" value={primary ?? inds[0]} onChange={(e) => setPrimary(e.target.value)}>
                  {inds.map((id) => (
                    <option key={id} value={id}>
                      {industries.find((i) => i.id === id)?.name ?? id}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("languages")}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" aria-pressed={langs.includes(l)} onClick={() => toggle(langs, setLangs, l)} className={chip(langs.includes(l))}>
                  {t(`languageNames.${l}`)}
                </button>
              ))}
            </div>
          </div>
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
            <Select id="countryCode" name="countryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} required>
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
          {countryCode === "VN" ? (
            <Field label={t("province")} htmlFor="provinceId" error={fieldError("provinceId")}>
              <Select id="provinceId" name="provinceId" defaultValue={defaults.provinceId ?? ""}>
                <option value="">{t("provinceNone")}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.region ? ` · ${p.region}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label={t("postalCode")} htmlFor="postalCode" error={fieldError("postalCode")}>
              <Input id="postalCode" name="postalCode" defaultValue={defaults.postalCode ?? ""} />
            </Field>
          )}
          <Field label={t("taxId")} htmlFor="taxId" error={fieldError("taxId")}>
            <Input id="taxId" name="taxId" defaultValue={defaults.taxId ?? ""} />
          </Field>
          <Field label={t("registrationNumber")} htmlFor="registrationNumber" error={fieldError("registrationNumber")}>
            <Input id="registrationNumber" name="registrationNumber" defaultValue={defaults.registrationNumber ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("capabilities")} description={t("capabilitiesHint")} />
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Checkbox name="oemCapable" defaultChecked={defaults.oemCapable} label={t("oemCapable")} />
            <Checkbox name="odmCapable" defaultChecked={defaults.odmCapable} label={t("odmCapable")} />
            <Checkbox name="privateLabelCapable" defaultChecked={defaults.privateLabelCapable} label={t("privateLabelCapable")} />
            <Checkbox name="factoryTourAvailable" defaultChecked={defaults.factoryTourAvailable} label={t("factoryTourAvailable")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("minOrderValueUsd")} htmlFor="minOrderValueUsd" error={fieldError("minOrderValueUsd")}>
              <Input id="minOrderValueUsd" name="minOrderValueUsd" inputMode="decimal" defaultValue={defaults.minOrderValueUsd ?? ""} />
            </Field>
            <Field label={t("avgLeadTimeDays")} htmlFor="avgLeadTimeDays" error={fieldError("avgLeadTimeDays")}>
              <Input id="avgLeadTimeDays" name="avgLeadTimeDays" type="number" min={0} defaultValue={defaults.avgLeadTimeDays ?? ""} />
            </Field>
            <Field label={t("sampleLeadTimeDays")} htmlFor="sampleLeadTimeDays" error={fieldError("sampleLeadTimeDays")}>
              <Input id="sampleLeadTimeDays" name="sampleLeadTimeDays" type="number" min={0} defaultValue={defaults.sampleLeadTimeDays ?? ""} />
            </Field>
            <Field label={t("exportPercentage")} htmlFor="exportPercentage" error={fieldError("exportPercentage")}>
              <Input id="exportPercentage" name="exportPercentage" type="number" min={0} max={100} defaultValue={defaults.exportPercentage ?? ""} />
            </Field>
            <Field label={t("exportExperienceYears")} htmlFor="exportExperienceYears" error={fieldError("exportExperienceYears")}>
              <Input id="exportExperienceYears" name="exportExperienceYears" type="number" min={0} defaultValue={defaults.exportExperienceYears ?? ""} />
            </Field>
            <Field label={t("exportCountries")} htmlFor="exportCountries" error={fieldError("exportCountries")} hint={t("exportCountriesHint")}>
              <Input id="exportCountries" name="exportCountries" defaultValue={defaults.exportCountries.join(", ")} placeholder="DE, US, JP" />
            </Field>
          </div>
          <Field label={t("mainMarkets")} htmlFor="mainMarkets" error={fieldError("mainMarkets")} hint={t("mainMarketsHint")}>
            <Input id="mainMarkets" name="mainMarkets" defaultValue={defaults.mainMarkets.join(", ")} placeholder={t("mainMarketsPlaceholder")} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("paymentTerms")}</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TERMS.map((term) => (
                <button key={term} type="button" aria-pressed={terms.includes(term)} onClick={() => toggle(terms, setTerms, term)} className={chip(terms.includes(term))}>
                  {term}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("acceptedIncoterms")}</p>
            <div className="flex flex-wrap gap-2">
              {INCOTERMS.map((i) => (
                <button key={i} type="button" aria-pressed={incoterms.includes(i)} onClick={() => toggle(incoterms, setIncoterms, i)} className={chip(incoterms.includes(i))}>
                  {i}
                </button>
              ))}
            </div>
            {fieldError("acceptedIncoterms") ? <p className="mt-1 text-xs text-danger-600">{fieldError("acceptedIncoterms")}</p> : null}
          </div>
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
