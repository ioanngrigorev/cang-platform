"use client";

import { ClipboardCheck, PackageCheck, ShieldAlert, ShieldCheck, Upload, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { openDisputeAction } from "@/modules/disputes/actions";
import { DISPUTE_TYPES } from "@/modules/disputes/schemas";
import { INSPECTION_TYPES } from "@/modules/inspection/schemas";
import { requestInspectionAction } from "@/modules/inspection/actions";
import { attachOrderDocumentsAction, buyerTransitionOrderAction, confirmReceiptAction } from "@/modules/orders/buyer-actions";

export type OrderActionsProps = {
  orderId: string;
  statusCode: string;
  allowedTransitions: string[];
  isCancellable: boolean;
  currency: string;
  heldPayments: number;
  inspectionProviders: Array<{ id: string; name: string }>;
  factoryAddress: string | null;
  hasOpenDispute: boolean;
};

/** Every buyer-side decision on an order, each wired to a real server action. */
export function OrderActions({
  orderId,
  statusCode,
  allowedTransitions,
  isCancellable,
  currency,
  heldPayments,
  inspectionProviders,
  factoryAddress,
  hasOpenDispute,
}: OrderActionsProps) {
  const t = useTranslations("orders.actions");
  const canConfirmDelivery = allowedTransitions.includes("DELIVERY");
  const canComplete = statusCode === "DELIVERY";
  const canDispute = !hasOpenDispute && allowedTransitions.includes("DISPUTED");
  const canCancel = isCancellable && allowedTransitions.includes("CANCELLED");

  return (
    <div className="flex flex-wrap gap-2">
      {canComplete ? (
        <DialogForm
          action={confirmReceiptAction}
          hidden={{ orderId }}
          title={t("completeTitle")}
          description={heldPayments > 0 ? t("completeDescriptionEscrow", { count: heldPayments }) : t("completeDescription")}
          submitLabel={t("completeSubmit")}
          trigger={(open) => (
            <Button type="button" variant="primary" onClick={open}>
              <ShieldCheck /> {t("complete")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("completeNote")} htmlFor="complete-note" error={fieldError("note")} hint={t("completeNoteHint")}>
              <Textarea id="complete-note" name="note" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}

      {canConfirmDelivery ? (
        <DialogForm
          action={buyerTransitionOrderAction}
          hidden={{ orderId, toStatus: "DELIVERY" }}
          title={t("deliveredTitle")}
          description={t("deliveredDescription")}
          submitLabel={t("deliveredSubmit")}
          trigger={(open) => (
            <Button type="button" variant="accent" onClick={open}>
              <PackageCheck /> {t("delivered")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("deliveredNote")} htmlFor="delivered-note" error={fieldError("note")}>
              <Textarea id="delivered-note" name="note" rows={3} placeholder={t("deliveredNotePlaceholder")} />
            </Field>
          )}
        </DialogForm>
      ) : null}

      <DialogForm
        action={requestInspectionAction}
        hidden={{ orderId }}
        title={t("inspectionTitle")}
        description={t("inspectionDescription")}
        submitLabel={t("inspectionSubmit")}
        trigger={(open) => (
          <Button type="button" variant="secondary" onClick={open}>
            <ClipboardCheck /> {t("inspection")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <div className="space-y-4">
            <Field label={t("inspectionType")} htmlFor="inspection-type" error={fieldError("type")} required>
              <Select id="inspection-type" name="type" defaultValue="PRE_SHIPMENT" required>
                {INSPECTION_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`inspectionTypes.${v}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("inspectionProvider")} htmlFor="inspection-provider" error={fieldError("providerId")} hint={t("inspectionProviderHint")}>
              <Select id="inspection-provider" name="providerId" defaultValue={inspectionProviders[0]?.id ?? ""}>
                <option value="">{t("inspectionProviderAny")}</option>
                {inspectionProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("inspectionDate")} htmlFor="inspection-date" error={fieldError("requestedDate")}>
              <Input id="inspection-date" name="requestedDate" type="date" />
            </Field>
            <Field label={t("inspectionAddress")} htmlFor="inspection-address" error={fieldError("factoryAddress")}>
              <Input id="inspection-address" name="factoryAddress" defaultValue={factoryAddress ?? ""} />
            </Field>
            <Field label={t("inspectionNotes")} htmlFor="inspection-notes" error={fieldError("notes")}>
              <Textarea id="inspection-notes" name="notes" rows={3} placeholder={t("inspectionNotesPlaceholder")} />
            </Field>
          </div>
        )}
      </DialogForm>

      <DialogForm
        action={attachOrderDocumentsAction}
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
              <Select id="doc-type" name="type" defaultValue="OTHER">
                {["PURCHASE_ORDER", "SPECIFICATION", "DRAWING", "CONTRACT", "PACKING_LIST", "PHOTO", "OTHER"].map((v) => (
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

      {canDispute ? (
        <DialogForm
          action={openDisputeAction}
          hidden={{ orderId }}
          title={t("disputeTitle")}
          description={t("disputeDescription")}
          submitLabel={t("disputeSubmit")}
          submitVariant="danger"
          size="lg"
          redirectTo={(data) => `/buyer/disputes/${data.id}`}
          trigger={(open) => (
            <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
              <ShieldAlert /> {t("dispute")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <div className="space-y-4">
              <Field label={t("disputeType")} htmlFor="dispute-type" error={fieldError("type")} required>
                <Select id="dispute-type" name="type" defaultValue="QUALITY" required>
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
              <Field label={t("disputeDetails")} htmlFor="dispute-description" error={fieldError("description")} required hint={t("disputeDetailsHint")}>
                <Textarea id="dispute-description" name="description" rows={5} required />
              </Field>
              <Field label={t("disputeAmount", { currency })} htmlFor="dispute-amount" error={fieldError("claimedAmount")} hint={t("disputeAmountHint")}>
                <Input id="dispute-amount" name="claimedAmount" inputMode="decimal" placeholder="0.00" />
              </Field>
            </div>
          )}
        </DialogForm>
      ) : null}

      {canCancel ? (
        <DialogForm
          action={buyerTransitionOrderAction}
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
