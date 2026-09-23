"use client";

import { Check, ClipboardCheck, MessageSquareWarning, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { approveVerificationAction, recordComplianceCheckAction, rejectVerificationAction, requestVerificationInfoAction, startVerificationReviewAction } from "@/modules/admin/verification/actions";
import { COMPLIANCE_CHECK_TYPES, COMPLIANCE_STATUSES } from "@/modules/admin/verification/schemas";

export function VerificationDecisionButtons({ verificationId, status, canReview }: { verificationId: string; status: string; canReview: boolean }) {
  const t = useTranslations("admin.verification");
  const tc = useTranslations("admin.common");
  if (!canReview || (status !== "PENDING" && status !== "IN_REVIEW")) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING" ? <ActionForm action={startVerificationReviewAction} hidden={{ verificationId }} label={t("startReview")} icon={<Play />} /> : null}
      <DialogForm
        action={approveVerificationAction}
        hidden={{ verificationId }}
        title={t("approve")}
        description={t("approveHint")}
        submitLabel={t("approve")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="primary" size="sm" onClick={open}>
            <Check /> {t("approve")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("reviewerNotes")} htmlFor="notes" error={fieldError("notes")}>
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        )}
      </DialogForm>
      <DialogForm
        action={requestVerificationInfoAction}
        hidden={{ verificationId }}
        title={t("requestInfo")}
        description={t("requestInfoHint")}
        submitLabel={t("requestInfo")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <MessageSquareWarning /> {t("requestInfo")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("messageToCompany")} htmlFor="notes" error={fieldError("notes")} required>
            <Textarea id="notes" name="notes" rows={4} required />
          </Field>
        )}
      </DialogForm>
      <DialogForm
        action={rejectVerificationAction}
        hidden={{ verificationId }}
        title={t("reject")}
        description={t("rejectHint")}
        submitLabel={t("reject")}
        submitVariant="danger"
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="danger" size="sm" onClick={open}>
            <X /> {t("reject")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required>
            <Textarea id="reason" name="reason" rows={4} required />
          </Field>
        )}
      </DialogForm>
    </div>
  );
}

export function RecordCheckButton({ verificationId }: { verificationId: string }) {
  const t = useTranslations("admin.verification");
  const tc = useTranslations("admin.common");
  return (
    <DialogForm
      action={recordComplianceCheckAction}
      hidden={{ verificationId }}
      title={t("recordCheck")}
      description={t("recordCheckHint")}
      submitLabel={tc("save")}
      cancelLabel={tc("cancel")}
      trigger={(open) => (
        <Button variant="secondary" size="xs" onClick={open}>
          <ClipboardCheck /> {t("recordCheck")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("checkType")} htmlFor="type" error={fieldError("type")} required>
              <Select id="type" name="type" defaultValue="SANCTIONS">
                {COMPLIANCE_CHECK_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("checkResult")} htmlFor="status" error={fieldError("status")} required>
              <Select id="status" name="status" defaultValue="CLEARED">
                {COMPLIANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("riskScore")} htmlFor="riskScore" error={fieldError("riskScore")} hint={t("riskScoreHint")}>
            <Input id="riskScore" name="riskScore" type="number" min={0} max={100} />
          </Field>
          <Field label={tc("note")} htmlFor="notes" error={fieldError("notes")}>
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        </>
      )}
    </DialogForm>
  );
}
