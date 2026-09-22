"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createLogisticsRequestAction } from "@/modules/logistics/buyer-actions";
import { CONTAINER_TYPES, LOGISTICS_SERVICES, SHIPMENT_MODES } from "@/modules/logistics/schemas";
import { INCOTERMS } from "@/modules/rfq/schemas";

export type LogisticsOrderOption = { id: string; orderNumber: string; supplierName: string };

export function LogisticsForm({
  countries,
  orders,
  defaults,
}: {
  countries: Array<{ code: string; name: string }>;
  orders: LogisticsOrderOption[];
  defaults: {
    orderId?: string | null;
    originCountryCode?: string;
    originCity?: string;
    destinationCompany?: string;
    destinationLine1?: string;
    destinationCity?: string;
    destinationPostalCode?: string;
    destinationCountryCode?: string;
    incoterm?: string | null;
    cargoDescription?: string;
    cargoValue?: number | null;
    currency?: string;
  };
}) {
  const t = useTranslations("logistics.form");
  const ts = useTranslations("logistics.services");
  const tm = useTranslations("logistics.modes");
  const router = useRouter();
  const [services, setServices] = React.useState<string[]>(["FACTORY_PICKUP", "SEA_FREIGHT", "CUSTOMS_BROKERAGE"]);
  const { state, formAction, fieldError } = useActionForm(createLogisticsRequestAction, {
    onSuccess: (data) => router.push(`/buyer/logistics/${data.id}`),
  });

  return (
    <form action={formAction} className="space-y-5">
      {services.map((s) => (
        <input key={s} type="hidden" name="services[]" value={s} />
      ))}

      <Card>
        <CardHeader title={t("services")} description={t("servicesHint")} />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {LOGISTICS_SERVICES.map((s) => {
              const on = services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setServices(on ? services.filter((x) => x !== s) : [...services, s])}
                  className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-steel-700 hover:bg-steel-50")}
                >
                  {ts(s)}
                </button>
              );
            })}
          </div>
          {fieldError("services") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("services")}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("order")} htmlFor="orderId" error={fieldError("orderId")} hint={t("orderHint")}>
              <Select id="orderId" name="orderId" defaultValue={defaults.orderId ?? ""}>
                <option value="">{t("orderNone")}</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.supplierName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("mode")} htmlFor="preferredMode" error={fieldError("preferredMode")}>
              <Select id="preferredMode" name="preferredMode" defaultValue="">
                <option value="">{t("modeAny")}</option>
                {SHIPMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {tm(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("incoterm")} htmlFor="incoterm" error={fieldError("incoterm")}>
              <Select id="incoterm" name="incoterm" defaultValue={defaults.incoterm ?? ""}>
                <option value="">{t("incotermNone")}</option>
                {INCOTERMS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("origin")} />
          <CardContent className="space-y-4">
            <Field label={t("company")} htmlFor="originCompany" error={fieldError("originCompany")}>
              <Input id="originCompany" name="originCompany" />
            </Field>
            <Field label={t("line1")} htmlFor="originLine1" error={fieldError("originLine1")} required>
              <Input id="originLine1" name="originLine1" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("city")} htmlFor="originCity" error={fieldError("originCity")} required className="sm:col-span-2">
                <Input id="originCity" name="originCity" defaultValue={defaults.originCity ?? ""} required />
              </Field>
              <Field label={t("postalCode")} htmlFor="originPostalCode" error={fieldError("originPostalCode")}>
                <Input id="originPostalCode" name="originPostalCode" />
              </Field>
            </div>
            <Field label={t("country")} htmlFor="originCountryCode" error={fieldError("originCountryCode")} required>
              <Select id="originCountryCode" name="originCountryCode" defaultValue={defaults.originCountryCode ?? "VN"} required>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("destination")} />
          <CardContent className="space-y-4">
            <Field label={t("company")} htmlFor="destinationCompany" error={fieldError("destinationCompany")}>
              <Input id="destinationCompany" name="destinationCompany" defaultValue={defaults.destinationCompany ?? ""} />
            </Field>
            <Field label={t("line1")} htmlFor="destinationLine1" error={fieldError("destinationLine1")} required>
              <Input id="destinationLine1" name="destinationLine1" defaultValue={defaults.destinationLine1 ?? ""} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("city")} htmlFor="destinationCity" error={fieldError("destinationCity")} required className="sm:col-span-2">
                <Input id="destinationCity" name="destinationCity" defaultValue={defaults.destinationCity ?? ""} required />
              </Field>
              <Field label={t("postalCode")} htmlFor="destinationPostalCode" error={fieldError("destinationPostalCode")}>
                <Input id="destinationPostalCode" name="destinationPostalCode" defaultValue={defaults.destinationPostalCode ?? ""} />
              </Field>
            </div>
            <Field label={t("country")} htmlFor="destinationCountryCode" error={fieldError("destinationCountryCode")} required>
              <Select id="destinationCountryCode" name="destinationCountryCode" defaultValue={defaults.destinationCountryCode ?? ""} required>
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("cargo")} />
        <CardContent className="space-y-4">
          <Field label={t("cargoDescription")} htmlFor="cargoDescription" error={fieldError("cargoDescription")} required>
            <Textarea id="cargoDescription" name="cargoDescription" rows={3} defaultValue={defaults.cargoDescription ?? ""} placeholder={t("cargoDescriptionPlaceholder")} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("hsCode")} htmlFor="hsCode" error={fieldError("hsCode")}>
              <Input id="hsCode" name="hsCode" />
            </Field>
            <Field label={t("packages")} htmlFor="packages" error={fieldError("packages")}>
              <Input id="packages" name="packages" type="number" min={0} />
            </Field>
            <Field label={t("weight")} htmlFor="grossWeightKg" error={fieldError("grossWeightKg")}>
              <Input id="grossWeightKg" name="grossWeightKg" inputMode="decimal" />
            </Field>
            <Field label={t("volume")} htmlFor="volumeCbm" error={fieldError("volumeCbm")}>
              <Input id="volumeCbm" name="volumeCbm" inputMode="decimal" />
            </Field>
            <Field label={t("containerType")} htmlFor="containerType" error={fieldError("containerType")}>
              <Select id="containerType" name="containerType" defaultValue="">
                <option value="">{t("containerNone")}</option>
                {CONTAINER_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("cargoValue")} htmlFor="cargoValue" error={fieldError("cargoValue")}>
              <Input id="cargoValue" name="cargoValue" inputMode="decimal" defaultValue={defaults.cargoValue ?? ""} />
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")}>
              <Select id="currency" name="currency" defaultValue={defaults.currency ?? "USD"}>
                {["USD", "VND", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox name="insuranceRequired" label={t("insurance")} description={t("insuranceHint")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("dates")} />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("readyDate")} htmlFor="readyDate" error={fieldError("readyDate")}>
              <Input id="readyDate" name="readyDate" type="date" />
            </Field>
            <Field label={t("requiredDelivery")} htmlFor="requiredDeliveryDate" error={fieldError("requiredDeliveryDate")}>
              <Input id="requiredDeliveryDate" name="requiredDeliveryDate" type="date" />
            </Field>
            <Field label={t("quoteDeadline")} htmlFor="quoteDeadline" error={fieldError("quoteDeadline")}>
              <Input id="quoteDeadline" name="quoteDeadline" type="date" />
            </Field>
          </div>
          <Field label={t("notes")} htmlFor="notes" error={fieldError("notes")}>
            <Textarea id="notes" name="notes" rows={3} placeholder={t("notesPlaceholder")} />
          </Field>
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end gap-2">
        <SubmitButton variant="primary">{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
