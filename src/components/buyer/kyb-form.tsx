"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { BeneficialOwners, type OwnerRow } from "@/components/buyer/beneficial-owners";
import { FileUpload } from "@/components/buyer/file-upload";
import { Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SubmitButton, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { submitKybAction } from "@/modules/company-profile/buyer-actions";

export function KybForm({
  countries,
  defaults,
  owners,
}: {
  countries: Array<{ code: string; name: string }>;
  defaults: { legalName: string; registrationNumber: string; taxId: string; registeredAddress: string; countryCode: string; representativeName: string };
  owners: OwnerRow[];
}) {
  const t = useTranslations("buyer.verification");
  const router = useRouter();
  const { state, formAction, fieldError } = useActionForm(submitKybAction, { onSuccess: () => router.refresh() });

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardHeader title={t("companyDetails")} />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t("legalName")} htmlFor="legalName" error={fieldError("legalName")} required>
            <Input id="legalName" name="legalName" defaultValue={defaults.legalName} required />
          </Field>
          <Field label={t("registrationNumber")} htmlFor="registrationNumber" error={fieldError("registrationNumber")} required>
            <Input id="registrationNumber" name="registrationNumber" defaultValue={defaults.registrationNumber} required />
          </Field>
          <Field label={t("taxId")} htmlFor="taxId" error={fieldError("taxId")} required>
            <Input id="taxId" name="taxId" defaultValue={defaults.taxId} required />
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
          <Field label={t("registeredAddress")} htmlFor="registeredAddress" error={fieldError("registeredAddress")} required className="sm:col-span-2">
            <Input id="registeredAddress" name="registeredAddress" defaultValue={defaults.registeredAddress} required />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("representative")} />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t("representativeName")} htmlFor="representativeName" error={fieldError("representativeName")} required>
            <Input id="representativeName" name="representativeName" defaultValue={defaults.representativeName} required />
          </Field>
          <Field label={t("representativeRole")} htmlFor="representativeRole" error={fieldError("representativeRole")}>
            <Input id="representativeRole" name="representativeRole" placeholder="CEO / Managing Director" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("documents")} description={t("documentsHint")} />
        <CardContent className="space-y-5">
          <div>
            <FileUpload name="businessRegistrationDocumentId" scope="verification" label={t("businessRegistration")} multiple={false} max={1} />
            {fieldError("businessRegistrationDocumentId") ? (
              <p className="mt-1 text-xs text-danger-600" role="alert">
                {fieldError("businessRegistrationDocumentId")}
              </p>
            ) : null}
          </div>
          <div>
            <FileUpload name="taxCertificateDocumentId" scope="verification" label={t("taxCertificate")} multiple={false} max={1} />
            {fieldError("taxCertificateDocumentId") ? (
              <p className="mt-1 text-xs text-danger-600" role="alert">
                {fieldError("taxCertificateDocumentId")}
              </p>
            ) : null}
          </div>
          <div>
            <FileUpload name="representativeIdDocumentId" scope="verification" label={t("representativeId")} multiple={false} max={1} />
            {fieldError("representativeIdDocumentId") ? (
              <p className="mt-1 text-xs text-danger-600" role="alert">
                {fieldError("representativeIdDocumentId")}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("owners")} description={t("ownersHint")} />
        <CardContent>
          <BeneficialOwners initial={owners} error={fieldError("ownersJson")} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <Checkbox name="declaration" label={t("declaration")} required />
          {fieldError("declaration") ? (
            <p className="mt-1.5 text-xs text-danger-600" role="alert">
              {fieldError("declaration")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end">
        <SubmitButton variant="primary">
          <ShieldCheck /> {t("submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
