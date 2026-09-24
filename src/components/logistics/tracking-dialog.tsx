"use client";

import { Barcode, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Select } from "@/components/ui";
import { useActionForm } from "@/components/ui/form";
import type { ActionResult } from "@/lib/action";
import { CARRIERS } from "@/modules/logistics/tracking/carriers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAction = (prev: ActionResult<any> | null, formData: FormData) => Promise<ActionResult<any>>;

export type TrackingValues = {
  carrierCode: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  vesselOrFlight: string | null;
  containerNumber: string | null;
  etd: string | null;
  eta: string | null;
};

/** Carrier + tracking number (+ vessel, container, ETD/ETA for freight). */
export function TrackingDialog({ action, shipmentId, values, freight }: { action: AnyAction; shipmentId: string; values: TrackingValues; freight: boolean }) {
  const t = useTranslations("tracking.trackingForm");
  const [carrierCode, setCarrierCode] = React.useState(values.carrierCode ?? "");
  return (
    <DialogForm
      action={action}
      hidden={{ shipmentId }}
      title={t("title")}
      description={t("description")}
      submitLabel={t("submit")}
      trigger={(open) => (
        <Button type="button" variant="secondary" onClick={open}>
          <Barcode /> {t("edit")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("carrier")} htmlFor="tr-carrier" error={fieldError("carrierCode")}>
            <Select id="tr-carrier" name="carrierCode" value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)}>
              <option value="">{t("noCarrier")}</option>
              {CARRIERS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                  {c.auto ? ` — ${t("auto")}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          {carrierCode === "OTHER" || (!carrierCode && freight) ? (
            <Field label={t("carrierName")} htmlFor="tr-carrier-name" error={fieldError("carrier")}>
              <Input id="tr-carrier-name" name="carrier" defaultValue={values.carrier ?? ""} placeholder="Maersk, ONE, Vietnam Airlines Cargo…" />
            </Field>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Field label={t("trackingNumber")} htmlFor="tr-number" error={fieldError("trackingNumber")} className="sm:col-span-2">
            <Input id="tr-number" name="trackingNumber" defaultValue={values.trackingNumber ?? ""} autoComplete="off" />
          </Field>
          {freight ? (
            <>
              <Field label={t("vessel")} htmlFor="tr-vessel" error={fieldError("vesselOrFlight")}>
                <Input id="tr-vessel" name="vesselOrFlight" defaultValue={values.vesselOrFlight ?? ""} />
              </Field>
              <Field label={t("container")} htmlFor="tr-container" error={fieldError("containerNumber")}>
                <Input id="tr-container" name="containerNumber" defaultValue={values.containerNumber ?? ""} />
              </Field>
            </>
          ) : null}
          <Field label={t("etd")} htmlFor="tr-etd" error={fieldError("etd")}>
            <Input id="tr-etd" name="etd" type="date" defaultValue={values.etd ?? ""} />
          </Field>
          <Field label={t("eta")} htmlFor="tr-eta" error={fieldError("eta")}>
            <Input id="tr-eta" name="eta" type="date" defaultValue={values.eta ?? ""} />
          </Field>
        </div>
      )}
    </DialogForm>
  );
}

/** "Sync with carrier" — pulls the latest GHN / GHTK status by tracking number. */
export function SyncTrackingButton({ action, shipmentId }: { action: AnyAction; shipmentId: string }) {
  const t = useTranslations("tracking.trackingForm");
  const router = useRouter();
  const { formAction, pending } = useActionForm(action, { onSuccess: () => router.refresh() });
  return (
    <form action={formAction}>
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("sync")}
      </Button>
    </form>
  );
}
