"use client";

import { CheckCircle2, ClipboardCheck, Factory, PackageCheck, ShieldAlert, StickyNote, Truck, Upload, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { ShipmentPartnerFields, type ProviderChoice } from "@/components/logistics/partner-fields";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { DISPUTE_TYPES } from "@/modules/disputes/schemas";
import { sellerOpenDisputeAction } from "@/modules/seller/sales/disputes/actions";
import { sellerAddOrderNoteAction, sellerAttachOrderDocumentsAction, sellerTransitionOrderAction } from "@/modules/seller/sales/orders/actions";
import { SELLER_ORDER_DOCUMENT_TYPES } from "@/modules/seller/sales/orders/schemas";
import { SHIPMENT_MODES } from "@/modules/seller/sales/shipments/schemas";

export type SellerOrderActionsProps = {
  orderId: string;
  statusCode: string;
  nextStatuses: string[];
  isCancellable: boolean;
  hasShipment: boolean;
  hasOpenDispute: boolean;
  canDispute: boolean;
  currency: string;
  defaultOriginPort?: string | null;
  providers?: ProviderChoice[];
};

const ICONS: Record<string, React.ReactNode> = {
  PAYMENT: <CheckCircle2 />,
  PRODUCTION: <Factory />,
  QUALITY_INSPECTION: <ClipboardCheck />,
  SHIPPING: <Truck />,
  DELIVERY: <PackageCheck />,
  COMPLETED: <CheckCircle2 />,
};

/** Every supplier-side decision on an order, each wired to a real server action. */
export function SellerOrderActions({ orderId, statusCode, nextStatuses, isCancellable, hasShipment, hasOpenDispute, canDispute, currency, defaultOriginPort, providers = [] }: SellerOrderActionsProps) {
  const t = useTranslations("sales.orderActions");
  const tm = useTranslations("logistics.modes");
  const forward = nextStatuses.filter((s) => s !== "CANCELLED" && s !== "DISPUTED");
  const canCancel = isCancellable && nextStatuses.includes("CANCELLED");
  const labelKey = (to: string) => (to === "PRODUCTION" && statusCode !== "PAYMENT" ? "PRODUCTION_back" : to);

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((to, i) => (
        <DialogForm
          key={to}
          action={sellerTransitionOrderAction}
          hidden={{ orderId, toStatus: to }}
          title={t(`dialog.${labelKey(to)}.title`)}
          description={t(`dialog.${labelKey(to)}.description`)}
          submitLabel={t(`dialog.${labelKey(to)}.submit`)}
          size={to === "SHIPPING" && !hasShipment ? "lg" : "md"}
          trigger={(open) => (
            <Button type="button" variant={i === 0 ? "primary" : "secondary"} onClick={open}>
              {ICONS[to]} {t(`transitions.${labelKey(to)}`)}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <div className="space-y-4">
              {to === "SHIPPING" && !hasShipment ? (
                <>
                  <p className="text-sm text-steel-600">{t("shipmentIntro")}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("shipment.mode")} htmlFor="ship-mode" error={fieldError("mode")} required>
                      <Select id="ship-mode" name="mode" defaultValue="SEA_FCL">
                        {SHIPMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {tm(m)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <span className="hidden sm:block" />
                    <ShipmentPartnerFields providers={providers} fieldError={fieldError} />
                    <Field label={t("shipment.trackingNumber")} htmlFor="ship-tracking" error={fieldError("trackingNumber")}>
                      <Input id="ship-tracking" name="trackingNumber" />
                    </Field>
                    <Field label={t("shipment.vessel")} htmlFor="ship-vessel" error={fieldError("vesselOrFlight")}>
                      <Input id="ship-vessel" name="vesselOrFlight" />
                    </Field>
                    <Field label={t("shipment.originPort")} htmlFor="ship-origin" error={fieldError("originPort")}>
                      <Input id="ship-origin" name="originPort" defaultValue={defaultOriginPort ?? ""} />
                    </Field>
                    <Field label={t("shipment.destinationPort")} htmlFor="ship-destination" error={fieldError("destinationPort")}>
                      <Input id="ship-destination" name="destinationPort" />
                    </Field>
                    <Field label={t("shipment.etd")} htmlFor="ship-etd" error={fieldError("etd")}>
                      <Input id="ship-etd" name="etd" type="date" />
                    </Field>
                    <Field label={t("shipment.eta")} htmlFor="ship-eta" error={fieldError("eta")}>
                      <Input id="ship-eta" name="eta" type="date" />
                    </Field>
                  </div>
                </>
              ) : null}
              <Field label={t("note")} htmlFor={`note-${to}`} error={fieldError("note")} hint={t("noteHint")}>
                <Textarea id={`note-${to}`} name="note" rows={3} />
              </Field>
            </div>
          )}
        </DialogForm>
      ))}

      <DialogForm
        action={sellerAttachOrderDocumentsAction}
        hidden={{ orderId }}
        title={t("uploadTitle")}
        description={t("uploadDescription")}
        submitLabel={t("uploadSubmit")}
        trigger={(open) => (
          <Button type="button" variant="secondary" onClick={open}>
            <Upload /> {t("upload")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <div className="space-y-4">
            <Field label={t("uploadType")} htmlFor="doc-type" error={fieldError("type")}>
              <Select id="doc-type" name="type" defaultValue="PACKING_LIST">
                {SELLER_ORDER_DOCUMENT_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`documentTypes.${v}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <FileUpload name="documentIds" scope="order" label={t("uploadFiles")} hint={t("uploadHint")} max={6} />
          </div>
        )}
      </DialogForm>

      <DialogForm
        action={sellerAddOrderNoteAction}
        hidden={{ orderId }}
        title={t("noteTitle")}
        description={t("noteDescription")}
        submitLabel={t("noteSubmit")}
        trigger={(open) => (
          <Button type="button" variant="secondary" onClick={open}>
            <StickyNote /> {t("addNote")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("noteBody")} htmlFor="order-note" error={fieldError("note")} required>
            <Textarea id="order-note" name="note" rows={4} required placeholder={t("notePlaceholder")} />
          </Field>
        )}
      </DialogForm>

      {canDispute && !hasOpenDispute ? (
        <DialogForm
          action={sellerOpenDisputeAction}
          hidden={{ orderId }}
          title={t("disputeTitle")}
          description={t("disputeDescription")}
          submitLabel={t("disputeSubmit")}
          submitVariant="danger"
          size="lg"
          refresh={false}
          trigger={(open) => (
            <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
              <ShieldAlert /> {t("dispute")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <div className="space-y-4">
              <Field label={t("disputeType")} htmlFor="dispute-type" error={fieldError("type")} required>
                <Select id="dispute-type" name="type" defaultValue="PAYMENT" required>
                  {DISPUTE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {t(`disputeTypes.${v}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("disputeSubject")} htmlFor="dispute-title" error={fieldError("title")} required>
                <Input id="dispute-title" name="title" required maxLength={200} />
              </Field>
              <Field label={t("disputeDetails")} htmlFor="dispute-description" error={fieldError("description")} required>
                <Textarea id="dispute-description" name="description" rows={5} required />
              </Field>
              <Field label={t("disputeAmount", { currency })} htmlFor="dispute-amount" error={fieldError("claimedAmount")}>
                <Input id="dispute-amount" name="claimedAmount" inputMode="decimal" placeholder="0.00" />
              </Field>
            </div>
          )}
        </DialogForm>
      ) : null}

      {canCancel ? (
        <DialogForm
          action={sellerTransitionOrderAction}
          hidden={{ orderId, toStatus: "CANCELLED" }}
          title={t("cancelTitle")}
          description={t("cancelDescription")}
          submitLabel={t("cancelSubmit")}
          submitVariant="danger"
          trigger={(open) => (
            <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
              <XCircle /> {t("cancel")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("cancelReason")} htmlFor="cancel-note" error={fieldError("note")} required>
              <Textarea id="cancel-note" name="note" rows={3} required />
            </Field>
          )}
        </DialogForm>
      ) : null}
    </div>
  );
}
