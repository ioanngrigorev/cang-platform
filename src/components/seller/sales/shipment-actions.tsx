"use client";

import { MapPin, PencilLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { addShipmentEventAction, createShipmentAction, updateShipmentAction } from "@/modules/seller/sales/shipments/actions";
import { SHIPMENT_EVENT_STATUSES, SHIPMENT_MODES } from "@/modules/seller/sales/shipments/schemas";

export type ShipmentFieldValues = {
  mode: string;
  carrier: string | null;
  trackingNumber: string | null;
  vesselOrFlight: string | null;
  containerNumber: string | null;
  originPort: string | null;
  destinationPort: string | null;
  packages: number | null;
  grossWeightKg: number | null;
  volumeCbm: number | null;
  etd: string | null;
  eta: string | null;
  notes: string | null;
};

const EMPTY: ShipmentFieldValues = { mode: "SEA_FCL", carrier: null, trackingNumber: null, vesselOrFlight: null, containerNumber: null, originPort: null, destinationPort: null, packages: null, grossWeightKg: null, volumeCbm: null, etd: null, eta: null, notes: null };

function ShipmentFields({ fieldError, values }: { fieldError: (name: string) => string | undefined; values: ShipmentFieldValues }) {
  const t = useTranslations("sales.shipmentActions");
  const tm = useTranslations("logistics.modes");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("mode")} htmlFor="sf-mode" error={fieldError("mode")} required>
        <Select id="sf-mode" name="mode" defaultValue={values.mode}>
          {SHIPMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {tm(m)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("carrier")} htmlFor="sf-carrier" error={fieldError("carrier")}>
        <Input id="sf-carrier" name="carrier" defaultValue={values.carrier ?? ""} placeholder={t("carrierPlaceholder")} />
      </Field>
      <Field label={t("trackingNumber")} htmlFor="sf-tracking" error={fieldError("trackingNumber")}>
        <Input id="sf-tracking" name="trackingNumber" defaultValue={values.trackingNumber ?? ""} />
      </Field>
      <Field label={t("vessel")} htmlFor="sf-vessel" error={fieldError("vesselOrFlight")}>
        <Input id="sf-vessel" name="vesselOrFlight" defaultValue={values.vesselOrFlight ?? ""} />
      </Field>
      <Field label={t("container")} htmlFor="sf-container" error={fieldError("containerNumber")}>
        <Input id="sf-container" name="containerNumber" defaultValue={values.containerNumber ?? ""} />
      </Field>
      <Field label={t("originPort")} htmlFor="sf-origin" error={fieldError("originPort")}>
        <Input id="sf-origin" name="originPort" defaultValue={values.originPort ?? ""} />
      </Field>
      <Field label={t("destinationPort")} htmlFor="sf-destination" error={fieldError("destinationPort")}>
        <Input id="sf-destination" name="destinationPort" defaultValue={values.destinationPort ?? ""} />
      </Field>
      <Field label={t("etd")} htmlFor="sf-etd" error={fieldError("etd")}>
        <Input id="sf-etd" name="etd" type="date" defaultValue={values.etd ?? ""} />
      </Field>
      <Field label={t("eta")} htmlFor="sf-eta" error={fieldError("eta")}>
        <Input id="sf-eta" name="eta" type="date" defaultValue={values.eta ?? ""} />
      </Field>
      <Field label={t("packages")} htmlFor="sf-packages" error={fieldError("packages")}>
        <Input id="sf-packages" name="packages" type="number" min={0} defaultValue={values.packages ?? ""} />
      </Field>
      <Field label={t("weight")} htmlFor="sf-weight" error={fieldError("grossWeightKg")}>
        <Input id="sf-weight" name="grossWeightKg" type="number" min={0} step="0.01" defaultValue={values.grossWeightKg ?? ""} />
      </Field>
      <Field label={t("volume")} htmlFor="sf-volume" error={fieldError("volumeCbm")}>
        <Input id="sf-volume" name="volumeCbm" type="number" min={0} step="0.001" defaultValue={values.volumeCbm ?? ""} />
      </Field>
      <Field label={t("notes")} htmlFor="sf-notes" error={fieldError("notes")} className="sm:col-span-2">
        <Textarea id="sf-notes" name="notes" rows={2} defaultValue={values.notes ?? ""} />
      </Field>
    </div>
  );
}

export function CreateShipmentButton({
  orders,
  defaultOrderId,
  size = "md",
  variant = "primary",
}: {
  orders: Array<{ id: string; orderNumber: string; buyerName?: string }>;
  defaultOrderId?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("sales.shipmentActions");
  return (
    <DialogForm
      action={createShipmentAction}
      title={t("createTitle")}
      description={t("createDescription")}
      submitLabel={t("createSubmit")}
      size="lg"
      trigger={(open) => (
        <Button type="button" variant={variant} size={size} onClick={open} disabled={orders.length === 0}>
          <Plus /> {t("create")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("order")} htmlFor="sf-order" error={fieldError("orderId")} required hint={orders.length > 1 ? t("orderHint") : undefined}>
            <Select id="sf-order" name="orderId" defaultValue={defaultOrderId ?? orders[0]?.id ?? ""} required>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                  {o.buyerName ? ` · ${o.buyerName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <ShipmentFields fieldError={fieldError} values={EMPTY} />
        </div>
      )}
    </DialogForm>
  );
}

export function UpdateShipmentButton({ shipmentId, values }: { shipmentId: string; values: ShipmentFieldValues }) {
  const t = useTranslations("sales.shipmentActions");
  return (
    <DialogForm
      action={updateShipmentAction}
      hidden={{ shipmentId }}
      title={t("updateTitle")}
      description={t("updateDescription")}
      submitLabel={t("updateSubmit")}
      size="lg"
      trigger={(open) => (
        <Button type="button" variant="secondary" onClick={open}>
          <PencilLine /> {t("update")}
        </Button>
      )}
    >
      {({ fieldError }) => <ShipmentFields fieldError={fieldError} values={values} />}
    </DialogForm>
  );
}

export function AddShipmentEventButton({ shipmentId, currentStatus }: { shipmentId: string; currentStatus: string }) {
  const t = useTranslations("sales.shipmentActions");
  const currentIndex = SHIPMENT_EVENT_STATUSES.indexOf(currentStatus as (typeof SHIPMENT_EVENT_STATUSES)[number]);
  const suggested = SHIPMENT_EVENT_STATUSES[Math.min(currentIndex + 1, SHIPMENT_EVENT_STATUSES.indexOf("DELIVERED"))] ?? "BOOKED";
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <DialogForm
      action={addShipmentEventAction}
      hidden={{ shipmentId }}
      title={t("eventTitle")}
      description={t("eventDescription")}
      submitLabel={t("eventSubmit")}
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open} disabled={currentStatus === "DELIVERED" || currentStatus === "CANCELLED"}>
          <MapPin /> {t("addEvent")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("eventStatus")} htmlFor="ev-status" error={fieldError("status")} required>
            <Select id="ev-status" name="status" defaultValue={suggested} required>
              {SHIPMENT_EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("eventLocation")} htmlFor="ev-location" error={fieldError("location")}>
            <Input id="ev-location" name="location" placeholder={t("eventLocationPlaceholder")} />
          </Field>
          <Field label={t("eventOccurredAt")} htmlFor="ev-occurred" error={fieldError("occurredAt")}>
            <Input id="ev-occurred" name="occurredAt" type="datetime-local" defaultValue={nowLocal} />
          </Field>
          <Field label={t("eventNote")} htmlFor="ev-note" error={fieldError("description")}>
            <Textarea id="ev-note" name="description" rows={3} placeholder={t("eventNotePlaceholder")} />
          </Field>
        </div>
      )}
    </DialogForm>
  );
}
