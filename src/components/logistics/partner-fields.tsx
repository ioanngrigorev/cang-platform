"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Field, Input, Select } from "@/components/ui";
import { CARRIERS } from "@/modules/logistics/tracking/carriers";

export type ProviderChoice = { id: string; name: string; modes: string[]; onPlatform: boolean };

/**
 * Logistics partner + carrier picker used when a supplier books or edits a shipment. A partner on CANG
 * gets the booking in its portal and reports statuses itself; otherwise the supplier updates them.
 */
export function ShipmentPartnerFields({
  providers,
  fieldError,
  defaults,
}: {
  providers: ProviderChoice[];
  fieldError: (name: string) => string | undefined;
  defaults?: { providerId?: string | null; carrierCode?: string | null; carrier?: string | null };
}) {
  const t = useTranslations("tracking");
  const [carrierCode, setCarrierCode] = React.useState(defaults?.carrierCode ?? "");
  return (
    <>
      <Field label={t("partner.choose")} htmlFor="sp-provider" error={fieldError("providerId")} hint={t("partner.chooseHint")} className="sm:col-span-2">
        <Select id="sp-provider" name="providerId" defaultValue={defaults?.providerId ?? ""}>
          <option value="">{t("partner.selfManaged")}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("trackingForm.carrier")} htmlFor="sp-carrier-code" error={fieldError("carrierCode")}>
        <Select id="sp-carrier-code" name="carrierCode" value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)}>
          <option value="">{t("trackingForm.noCarrier")}</option>
          {CARRIERS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("trackingForm.carrierName")} htmlFor="sp-carrier" error={fieldError("carrier")}>
        <Input id="sp-carrier" name="carrier" defaultValue={defaults?.carrier ?? ""} placeholder="Maersk, ONE, DHL…" disabled={!!carrierCode && carrierCode !== "OTHER"} />
      </Field>
    </>
  );
}
