"use client";

import { Check, CheckCircle2, Search, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { approveReviewAction, rejectReviewAction } from "@/modules/admin/moderation/actions";
import { updateRiskFlagAction } from "@/modules/admin/risk/actions";

export function ReviewModerationButtons({ reviewId, status, canModerate }: { reviewId: string; status: string; canModerate: boolean }) {
  const t = useTranslations("admin.moderation");
  const tc = useTranslations("admin.common");
  if (!canModerate) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {status !== "PUBLISHED" ? <ActionForm action={approveReviewAction} hidden={{ reviewId }} label={t("approve")} icon={<Check />} variant="primary" size="xs" /> : null}
      {status !== "REMOVED" ? (
        <DialogForm
          action={rejectReviewAction}
          hidden={{ reviewId }}
          title={t("rejectReview")}
          description={t("rejectReviewHint")}
          submitLabel={t("reject")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="ghost" size="xs" onClick={open}>
              <X /> {t("reject")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              <Field label={t("rejectMode")} htmlFor="mode" error={fieldError("mode")}>
                <Select id="mode" name="mode" defaultValue="REMOVED">
                  <option value="REMOVED">{t("modeRemoved")}</option>
                  <option value="HIDDEN">{t("modeHidden")}</option>
                </Select>
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

export function RiskFlagButtons({ flagId, status, canWrite }: { flagId: string; status: string; canWrite: boolean }) {
  const t = useTranslations("admin.risk");
  const tc = useTranslations("admin.common");
  if (!canWrite || status === "RESOLVED" || status === "DISMISSED") return null;
  const closeDialog = (target: "RESOLVED" | "DISMISSED") => (
    <DialogForm
      key={target}
      action={updateRiskFlagAction}
      hidden={{ flagId, status: target }}
      title={target === "RESOLVED" ? t("resolve") : t("dismiss")}
      submitLabel={target === "RESOLVED" ? t("resolve") : t("dismiss")}
      submitVariant={target === "RESOLVED" ? "primary" : "secondary"}
      cancelLabel={tc("cancel")}
      trigger={(open) => (
        <Button variant={target === "RESOLVED" ? "primary" : "ghost"} size="xs" onClick={open}>
          {target === "RESOLVED" ? <CheckCircle2 /> : <XCircle />} {target === "RESOLVED" ? t("resolve") : t("dismiss")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <Field label={t("resolution")} htmlFor="resolution" error={fieldError("resolution")} required>
          <Textarea id="resolution" name="resolution" rows={3} required />
        </Field>
      )}
    </DialogForm>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {status === "OPEN" ? <ActionForm action={updateRiskFlagAction} hidden={{ flagId, status: "INVESTIGATING" }} label={t("investigate")} icon={<Search />} size="xs" /> : null}
      {closeDialog("RESOLVED")}
      {closeDialog("DISMISSED")}
    </span>
  );
}
