"use client";

import { CheckCircle2, RotateCcw, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { adminConfirmPaymentAction, adminRefundPaymentAction, adminReleasePaymentAction } from "@/modules/admin/payments/actions";

export function PaymentAdminButtons({ paymentId, status, escrowStatus, amount, currency, canWrite }: { paymentId: string; status: string; escrowStatus: string; amount: number; currency: string; canWrite: boolean }) {
  const t = useTranslations("admin.payments");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  const canConfirm = status === "PENDING" || status === "AUTHORIZED";
  const canRelease = escrowStatus === "HELD" || escrowStatus === "PARTIALLY_RELEASED";
  const canRefund = status === "PAID" || status === "SETTLED" || status === "DISPUTED";
  if (!canConfirm && !canRelease && !canRefund) return null;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {canConfirm ? (
        <DialogForm
          action={adminConfirmPaymentAction}
          hidden={{ paymentId }}
          title={t("confirm")}
          description={t("confirmHint")}
          submitLabel={t("confirm")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="primary" size="xs" onClick={open}>
              <CheckCircle2 /> {t("confirm")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              <Field label={t("bankReference")} htmlFor="bankReference" error={fieldError("bankReference")}>
                <Input id="bankReference" name="bankReference" />
              </Field>
              <Field label={tc("note")} htmlFor="note" error={fieldError("note")}>
                <Textarea id="note" name="note" rows={2} />
              </Field>
            </>
          )}
        </DialogForm>
      ) : null}
      {canRelease ? (
        <DialogForm
          action={adminReleasePaymentAction}
          hidden={{ paymentId }}
          title={t("release")}
          description={t("releaseHint")}
          submitLabel={t("release")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size="xs" onClick={open}>
              <Unlock /> {t("release")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required>
              <Textarea id="reason" name="reason" rows={3} required />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {canRefund ? (
        <DialogForm
          action={adminRefundPaymentAction}
          hidden={{ paymentId }}
          title={t("refund")}
          description={t("refundHint")}
          submitLabel={t("refund")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="ghost" size="xs" onClick={open}>
              <RotateCcw /> {t("refund")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              <Field label={t("refundAmount", { currency })} htmlFor="amount" error={fieldError("amount")} hint={t("refundAmountHint")}>
                <Input id="amount" name="amount" type="number" step="0.01" min={0} max={amount} defaultValue={amount} />
              </Field>
              <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required>
                <Textarea id="reason" name="reason" rows={3} required />
              </Field>
            </>
          )}
        </DialogForm>
      ) : null}
    </span>
  );
}
