"use client";

import { Gavel, MessageSquare, Search, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { closeDisputeAdminAction, disputeAdminMessageAction, disputeUnderReviewAction, resolveDisputeAction } from "@/modules/admin/disputes/actions";

export function DisputeAdminActions({
  disputeId,
  status,
  currency,
  claimedAmount,
  orderStatus,
  payments,
  canResolve,
}: {
  disputeId: string;
  status: string;
  currency: string;
  claimedAmount: number | null;
  orderStatus: string;
  payments: Array<{ id: string; label: string; amount: number }>;
  canResolve: boolean;
}) {
  const t = useTranslations("admin.disputes");
  const tc = useTranslations("admin.common");
  if (!canResolve) return null;
  const closed = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"].includes(status);
  if (closed) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "UNDER_REVIEW" ? <ActionForm action={disputeUnderReviewAction} hidden={{ disputeId }} label={t("underReview")} icon={<Search />} /> : null}
      <DialogForm
        action={resolveDisputeAction}
        hidden={{ disputeId }}
        title={t("resolve")}
        description={t("resolveHint")}
        submitLabel={t("resolve")}
        cancelLabel={tc("cancel")}
        size="lg"
        trigger={(open) => (
          <Button variant="primary" size="sm" onClick={open}>
            <Gavel /> {t("resolve")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("outcome")} htmlFor="outcome" error={fieldError("outcome")} required>
                <Select id="outcome" name="outcome" defaultValue="RESOLVED_NO_ACTION">
                  {(["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED"] as const).map((o) => (
                    <option key={o} value={o}>
                      {t(`outcomes.${o}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("refundAmount", { currency })} htmlFor="refundAmount" error={fieldError("refundAmount")} hint={t("refundAmountHint")}>
                <Input id="refundAmount" name="refundAmount" type="number" step="0.01" min={0} defaultValue={claimedAmount ?? ""} />
              </Field>
              <Field label={t("refundPayment")} htmlFor="refundPaymentId" error={fieldError("refundPaymentId")} hint={payments.length ? t("refundPaymentHint") : t("noRefundablePayment")}>
                <Select id="refundPaymentId" name="refundPaymentId" defaultValue="">
                  <option value="">{t("recordOnly")}</option>
                  {payments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {orderStatus === "DISPUTED" ? (
                <Field label={t("resumeStatus")} htmlFor="resumeStatus" error={fieldError("resumeStatus")} hint={t("resumeStatusHint")}>
                  <Select id="resumeStatus" name="resumeStatus" defaultValue="">
                    <option value="">{t("resumeAuto")}</option>
                    {["PRODUCTION", "SHIPPING", "DELIVERY", "COMPLETED", "CANCELLED"].map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
            <Field label={t("resolutionText")} htmlFor="resolution" error={fieldError("resolution")} required>
              <Textarea id="resolution" name="resolution" rows={4} required />
            </Field>
          </>
        )}
      </DialogForm>
      <DialogForm
        action={closeDisputeAdminAction}
        hidden={{ disputeId }}
        title={t("close")}
        description={t("closeHint")}
        submitLabel={t("close")}
        submitVariant="secondary"
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <XCircle /> {t("close")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={tc("note")} htmlFor="resolution" error={fieldError("resolution")}>
            <Textarea id="resolution" name="resolution" rows={3} />
          </Field>
        )}
      </DialogForm>
    </div>
  );
}

export function DisputeAdminReply({ disputeId, disabled }: { disputeId: string; disabled?: boolean }) {
  const t = useTranslations("admin.disputes");
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { formAction, fieldError } = useActionForm(disputeAdminMessageAction, {
    onSuccess: () => {
      formRef.current?.reset();
      router.refresh();
    },
  });
  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <Field label={t("postMessage")} htmlFor="body" error={fieldError("body")}>
        <Textarea id="body" name="body" rows={3} disabled={disabled} placeholder={t("postMessagePlaceholder")} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox name="isInternal" label={t("internalNote")} description={t("internalNoteHint")} />
        {disabled ? null : (
          <SubmitButton variant="primary" size="sm">
            <MessageSquare /> {t("send")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
