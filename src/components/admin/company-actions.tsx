"use client";

import { Award, Ban, BadgeCheck, Check, ShieldOff, Star, StickyNote, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Select, Textarea } from "@/components/ui";
import {
  addCompanyBadgeAction,
  addCompanyNoteAction,
  removeCompanyBadgeAction,
  reviewCertificationAction,
  setCompanyStatusAction,
  setCompanyVerificationAction,
  toggleCompanyFeaturedAction,
} from "@/modules/admin/companies/actions";
import { VERIFICATION_STATUSES } from "@/modules/admin/companies/schemas";

export function CompanyAdminActions({
  companyId,
  status,
  verificationStatus,
  isFeatured,
  badges,
  canWrite,
}: {
  companyId: string;
  status: string;
  verificationStatus: string;
  isFeatured: boolean;
  badges: Array<{ id: string; code: string; name: string }>;
  canWrite: boolean;
}) {
  const t = useTranslations("admin.companies");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "SUSPENDED" || status === "BANNED" || status === "PENDING" ? (
        <ActionForm action={setCompanyStatusAction} hidden={{ companyId, status: "ACTIVE" }} label={t("activate")} icon={<Check />} variant="primary" />
      ) : null}
      {status !== "SUSPENDED" ? (
        <DialogForm
          action={setCompanyStatusAction}
          hidden={{ companyId, status: "SUSPENDED" }}
          title={t("suspend")}
          description={t("suspendHint")}
          submitLabel={t("suspend")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size="sm" onClick={open}>
              <ShieldOff /> {t("suspend")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")}>
              <Textarea id="reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {status !== "BANNED" ? (
        <DialogForm
          action={setCompanyStatusAction}
          hidden={{ companyId, status: "BANNED" }}
          title={t("ban")}
          description={t("banHint")}
          submitLabel={t("ban")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="danger" size="sm" onClick={open}>
              <Ban /> {t("ban")}
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
      <DialogForm
        action={setCompanyVerificationAction}
        hidden={{ companyId }}
        title={t("setVerification")}
        description={t("setVerificationHint")}
        submitLabel={tc("save")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <BadgeCheck /> {t("setVerification")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field label={t("verificationStatus")} htmlFor="verificationStatus" error={fieldError("verificationStatus")} required>
              <Select id="verificationStatus" name="verificationStatus" defaultValue={verificationStatus}>
                {VERIFICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {tc(`verification.${s}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("note")} htmlFor="note" error={fieldError("note")}>
              <Textarea id="note" name="note" rows={2} />
            </Field>
          </>
        )}
      </DialogForm>
      <ActionForm action={toggleCompanyFeaturedAction} hidden={{ companyId, featured: isFeatured ? "false" : "true" }} label={isFeatured ? t("unfeature") : t("feature")} icon={<Star />} />
      <DialogForm
        action={addCompanyBadgeAction}
        hidden={{ companyId }}
        title={t("addBadge")}
        submitLabel={t("addBadge")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <Award /> {t("addBadge")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field label={t("badge")} htmlFor="badgeId" error={fieldError("badgeId")} required>
              <Select id="badgeId" name="badgeId" defaultValue={badges[0]?.id ?? ""}>
                {badges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("note")} htmlFor="note" error={fieldError("note")}>
              <Textarea id="note" name="note" rows={2} />
            </Field>
          </>
        )}
      </DialogForm>
      <DialogForm
        action={addCompanyNoteAction}
        hidden={{ companyId }}
        title={t("addNote")}
        submitLabel={t("addNote")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <StickyNote /> {t("addNote")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={tc("note")} htmlFor="note" error={fieldError("note")} required>
            <Textarea id="note" name="note" rows={4} required />
          </Field>
        )}
      </DialogForm>
    </div>
  );
}

export function RemoveBadgeButton({ companyId, companyBadgeId }: { companyId: string; companyBadgeId: string }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={removeCompanyBadgeAction} hidden={{ companyId, companyBadgeId }} label={tc("remove")} icon={<Trash2 />} variant="ghost" size="xs" />;
}

export function CertificationReviewButtons({ companyId, companyCertificationId }: { companyId: string; companyCertificationId: string }) {
  const tc = useTranslations("admin.common");
  return (
    <span className="inline-flex gap-1">
      <ActionForm action={reviewCertificationAction} hidden={{ companyId, companyCertificationId, status: "VERIFIED" }} label={tc("verify")} icon={<Check />} variant="primary" size="xs" />
      <ActionForm action={reviewCertificationAction} hidden={{ companyId, companyCertificationId, status: "REJECTED" }} label={tc("reject")} icon={<X />} variant="ghost" size="xs" />
    </span>
  );
}
