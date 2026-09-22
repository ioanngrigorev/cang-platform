"use client";

import { Ban, Copy, Pencil, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Textarea } from "@/components/ui";
import { cancelRfqAction, closeRfqAction, duplicateRfqAction, publishRfqAction } from "@/modules/rfq/actions";

/** Status actions for one RFQ. Client-side so the dialogs can pass render functions. */
export function RfqActions({ rfqId, status }: { rfqId: string; status: string }) {
  const t = useTranslations("rfq.detail");
  const isDraft = status === "DRAFT";
  const isOpen = status === "OPEN";

  return (
    <>
      {isDraft ? (
        <Button href={`/buyer/rfqs/${rfqId}/edit`} variant="secondary">
          <Pencil /> {t("edit")}
        </Button>
      ) : null}

      {isDraft ? <ActionForm action={publishRfqAction} hidden={{ rfqId }} label={t("publish")} icon={<Send />} variant="primary" size="md" /> : null}

      {isOpen ? (
        <DialogForm
          action={closeRfqAction}
          hidden={{ rfqId }}
          title={t("closeTitle")}
          description={t("closeDescription")}
          submitLabel={t("closeSubmit")}
          trigger={(open) => (
            <Button type="button" variant="secondary" onClick={open}>
              <Ban /> {t("close")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("reason")} htmlFor="close-reason" error={fieldError("reason")}>
              <Textarea id="close-reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}

      <ActionForm action={duplicateRfqAction} hidden={{ rfqId }} label={t("duplicate")} icon={<Copy />} variant="ghost" size="md" redirectTo={(d) => `/buyer/rfqs/${d.id}/edit`} />

      {isDraft || isOpen ? (
        <DialogForm
          action={cancelRfqAction}
          hidden={{ rfqId }}
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
            <Field label={t("reason")} htmlFor="cancel-reason" error={fieldError("reason")}>
              <Textarea id="cancel-reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}
    </>
  );
}
