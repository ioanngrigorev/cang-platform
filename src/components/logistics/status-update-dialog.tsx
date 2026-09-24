"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/action";
import { REASON_GROUPS, REASON_REQUIRED, reasonGroupsFor, type ShipmentStatus } from "@/modules/logistics/tracking/statuses";

/**
 * "Update status" for a shipment — used by logistics partners, suppliers and admins with their own server
 * action. Only statuses allowed next are offered; the fields adapt to the status (reason for problems,
 * receiver + proof of delivery for delivery, truck for truck assignment, counted packages/weight at pickup…).
 */
export function StatusUpdateDialog({
  action,
  shipmentId,
  allowed,
  uploads = true,
  size = "md",
  variant = "primary",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (prev: ActionResult<any> | null, formData: FormData) => Promise<ActionResult<any>>;
  shipmentId: string;
  allowed: ShipmentStatus[];
  uploads?: boolean;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("tracking");
  const suggested = allowed.find((s) => !REASON_REQUIRED.has(s) && s !== "CANCELLED") ?? allowed[0];
  const [status, setStatus] = React.useState<ShipmentStatus | undefined>(suggested);
  const nowLocal = React.useMemo(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), []);
  const needsReason = !!status && (REASON_REQUIRED.has(status) || status === "CANCELLED");

  return (
    <DialogForm
      action={action}
      hidden={{ shipmentId }}
      title={t("form.title")}
      description={t("form.description")}
      submitLabel={t("form.submit")}
      size="lg"
      trigger={(open) => (
        <Button type="button" variant={variant} size={size} onClick={open} disabled={allowed.length === 0} title={allowed.length === 0 ? t("form.noOptions") : undefined}>
          <MapPin /> {t("form.report")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.status")} htmlFor="su-status" error={fieldError("status")} required className="sm:col-span-2">
            <Select id="su-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)} required>
              {allowed.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          </Field>

          {needsReason && status ? (
            <Field label={t("form.reason")} htmlFor="su-reason" error={fieldError("reasonCode")} required={status !== "CANCELLED"} className="sm:col-span-2">
              <Select id="su-reason" name="reasonCode" defaultValue="" key={status}>
                <option value="">{t("form.chooseReason")}</option>
                {reasonGroupsFor(status).map((g) => (
                  <optgroup key={g} label={t(`reasonGroups.${g}`)}>
                    {REASON_GROUPS[g].map((r) => (
                      <option key={r} value={r}>
                        {t(`reasons.${r}`)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          ) : null}

          {status === "DELIVERED" ? (
            <>
              <Field label={t("form.receiverName")} htmlFor="su-receiver" error={fieldError("receiverName")} required className="sm:col-span-2">
                <Input id="su-receiver" name="receiverName" placeholder={t("form.receiverPlaceholder")} />
              </Field>
              {uploads ? <FileUpload name="pod" scope="shipment" accept="image/*,application/pdf" max={3} label={t("form.pod")} hint={t("form.podHint")} className="sm:col-span-2" /> : null}
            </>
          ) : null}

          {status === "VEHICLE_ASSIGNED" ? (
            <>
              <Field label={t("form.vehiclePlate")} htmlFor="su-plate" error={fieldError("vehiclePlate")} required>
                <Input id="su-plate" name="vehiclePlate" placeholder="51C-123.45" />
              </Field>
              <Field label={t("form.driverName")} htmlFor="su-driver" error={fieldError("driverName")}>
                <Input id="su-driver" name="driverName" />
              </Field>
              <Field label={t("form.driverPhone")} htmlFor="su-driver-phone" error={fieldError("driverPhone")}>
                <Input id="su-driver-phone" name="driverPhone" type="tel" />
              </Field>
            </>
          ) : null}

          {status === "PICKED_UP" || status === "AT_WAREHOUSE" ? (
            <>
              <Field label={t("form.packages")} htmlFor="su-packages" error={fieldError("packages")}>
                <Input id="su-packages" name="packages" type="number" min={0} />
              </Field>
              <Field label={t("form.weight")} htmlFor="su-weight" error={fieldError("grossWeightKg")}>
                <Input id="su-weight" name="grossWeightKg" type="number" min={0} step="0.01" />
              </Field>
            </>
          ) : null}

          {status === "DEPARTED" || status === "AT_ORIGIN_PORT" ? (
            <>
              <Field label={t("form.vessel")} htmlFor="su-vessel" error={fieldError("vesselOrFlight")}>
                <Input id="su-vessel" name="vesselOrFlight" />
              </Field>
              <Field label={t("form.container")} htmlFor="su-container" error={fieldError("containerNumber")}>
                <Input id="su-container" name="containerNumber" />
              </Field>
            </>
          ) : null}

          {status === "EXPORT_CLEARED" || status === "IMPORT_CLEARED" || status === "CUSTOMS_CLEARANCE" ? (
            <Field label={t("form.declaration")} htmlFor="su-declaration" error={fieldError("customsDeclaration")} className="sm:col-span-2">
              <Input id="su-declaration" name="customsDeclaration" />
            </Field>
          ) : null}

          <Field label={t("form.location")} htmlFor="su-location" error={fieldError("location")}>
            <Input id="su-location" name="location" placeholder={t("form.locationPlaceholder")} />
          </Field>
          <Field label={t("form.occurredAt")} htmlFor="su-occurred" error={fieldError("occurredAt")}>
            <Input id="su-occurred" name="occurredAt" type="datetime-local" defaultValue={nowLocal} max={nowLocal} />
          </Field>
          <Field label={t("form.note")} htmlFor="su-note" error={fieldError("description")} className="sm:col-span-2">
            <Textarea id="su-note" name="description" rows={2} placeholder={t("form.notePlaceholder")} />
          </Field>
          {uploads && status !== "DELIVERED" ? <FileUpload name="attachments" scope="shipment" accept="image/*,application/pdf" max={5} label={t("form.attachments")} hint={t("form.attachmentsHint")} className="sm:col-span-2" /> : null}
        </div>
      )}
    </DialogForm>
  );
}
