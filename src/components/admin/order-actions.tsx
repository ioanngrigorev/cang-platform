"use client";

import { ArrowRightLeft, StickyNote, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { adminCancelOrderAction, adminOrderNoteAction, adminTransitionOrderAction } from "@/modules/admin/orders/actions";

export function OrderAdminActions({ orderId, statusCode, statuses, canWrite }: { orderId: string; statusCode: string; statuses: Array<{ code: string; name: string }>; canWrite: boolean }) {
  const t = useTranslations("admin.orders");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  const terminal = statusCode === "COMPLETED" || statusCode === "CANCELLED";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DialogForm
        action={adminTransitionOrderAction}
        hidden={{ orderId }}
        title={t("forceStatus")}
        description={t("forceStatusHint")}
        submitLabel={t("forceStatus")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <ArrowRightLeft /> {t("forceStatus")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field label={t("targetStatus")} htmlFor="toStatus" error={fieldError("toStatus")} required>
              <Select id="toStatus" name="toStatus" defaultValue={statuses.find((s) => s.code !== statusCode)?.code ?? ""}>
                {statuses
                  .filter((s) => s.code !== statusCode)
                  .map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={tc("note")} htmlFor="note" error={fieldError("note")} hint={t("noteVisibleHint")}>
              <Textarea id="note" name="note" rows={3} />
            </Field>
          </>
        )}
      </DialogForm>
      <DialogForm
        action={adminOrderNoteAction}
        hidden={{ orderId }}
        title={t("addNote")}
        description={t("addNoteHint")}
        submitLabel={t("addNote")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <StickyNote /> {t("addNote")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field label={t("noteTitle")} htmlFor="title" error={fieldError("title")} required>
              <Input id="title" name="title" required />
            </Field>
            <Field label={t("noteBody")} htmlFor="description" error={fieldError("description")}>
              <Textarea id="description" name="description" rows={4} />
            </Field>
            <div className="flex flex-wrap gap-6">
              <Checkbox name="visibleToBuyer" label={t("visibleToBuyer")} />
              <Checkbox name="visibleToSupplier" label={t("visibleToSupplier")} />
            </div>
          </>
        )}
      </DialogForm>
      {!terminal ? (
        <DialogForm
          action={adminCancelOrderAction}
          hidden={{ orderId }}
          title={t("cancelOrder")}
          description={t("cancelOrderHint")}
          submitLabel={t("cancelOrder")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="danger" size="sm" onClick={open}>
              <XCircle /> {t("cancelOrder")}
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
    </div>
  );
}
