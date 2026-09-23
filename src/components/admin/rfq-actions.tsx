"use client";

import { CalendarPlus, Eye, EyeOff, Flag, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { adminCloseRfqAction, adminExtendRfqAction, adminFlagRfqSpamAction, adminRfqVisibilityAction } from "@/modules/admin/rfqs/actions";

export function RfqAdminActions({ rfqId, status, visibility, canWrite }: { rfqId: string; status: string; visibility: string; canWrite: boolean }) {
  const t = useTranslations("admin.rfqs");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  const terminal = status === "AWARDED" || status === "CANCELLED";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!terminal ? (
        <DialogForm
          action={adminCloseRfqAction}
          hidden={{ rfqId }}
          title={t("closeRfq")}
          description={t("closeRfqHint")}
          submitLabel={t("closeRfq")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size="sm" onClick={open}>
              <XCircle /> {t("closeRfq")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              <Field label={t("closeMode")} htmlFor="mode" error={fieldError("mode")} required>
                <Select id="mode" name="mode" defaultValue="CLOSED">
                  <option value="CLOSED">{t("modeClosed")}</option>
                  <option value="CANCELLED">{t("modeCancelled")}</option>
                </Select>
              </Field>
              <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required>
                <Textarea id="reason" name="reason" rows={3} required />
              </Field>
            </>
          )}
        </DialogForm>
      ) : null}
      {status === "OPEN" || status === "CLOSED" || status === "EXPIRED" ? (
        <DialogForm
          action={adminExtendRfqAction}
          hidden={{ rfqId }}
          title={t("extendDeadline")}
          submitLabel={t("extendDeadline")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size="sm" onClick={open}>
              <CalendarPlus /> {t("extendDeadline")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("newDeadline")} htmlFor="quoteDeadline" error={fieldError("quoteDeadline")} required>
              <Input id="quoteDeadline" name="quoteDeadline" type="date" required />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {!terminal ? (
        <ActionForm action={adminRfqVisibilityAction} hidden={{ rfqId, visibility: visibility === "PUBLIC" ? "INVITED_ONLY" : "PUBLIC" }} label={visibility === "PUBLIC" ? t("makeInvitedOnly") : t("makePublic")} icon={visibility === "PUBLIC" ? <EyeOff /> : <Eye />} />
      ) : null}
      {status !== "CANCELLED" ? (
        <DialogForm
          action={adminFlagRfqSpamAction}
          hidden={{ rfqId }}
          title={t("flagSpam")}
          description={t("flagSpamHint")}
          submitLabel={t("flagSpam")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="danger" size="sm" onClick={open}>
              <Flag /> {t("flagSpam")}
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
    </div>
  );
}
