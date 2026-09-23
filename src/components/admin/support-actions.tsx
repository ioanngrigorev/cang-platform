"use client";

import { Send, Settings2, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { assignTicketAction, replyTicketAction, updateTicketAction } from "@/modules/admin/support/actions";

const STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export function TicketAdminActions({ ticketId, status, priority, assigneeId, currentUserId, staff, canWrite }: { ticketId: string; status: string; priority: string; assigneeId: string | null; currentUserId: string; staff: Array<{ id: string; name: string }>; canWrite: boolean }) {
  const t = useTranslations("admin.support");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {assigneeId !== currentUserId ? <ActionForm action={assignTicketAction} hidden={{ ticketId, assigneeId: currentUserId }} label={t("assignToMe")} icon={<UserCheck />} /> : null}
      <DialogForm
        action={assignTicketAction}
        hidden={{ ticketId }}
        title={t("assign")}
        submitLabel={t("assign")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <UserCheck /> {t("assign")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("assignee")} htmlFor="assigneeId" error={fieldError("assigneeId")}>
            <Select id="assigneeId" name="assigneeId" defaultValue={assigneeId ?? currentUserId}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </DialogForm>
      <DialogForm
        action={updateTicketAction}
        hidden={{ ticketId }}
        title={t("updateTicket")}
        submitLabel={tc("save")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="secondary" size="sm" onClick={open}>
            <Settings2 /> {t("updateTicket")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tc("status")} htmlFor="status" error={fieldError("status")}>
                <Select id="status" name="status" defaultValue={status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("priority")} htmlFor="priority" error={fieldError("priority")}>
                <Select id="priority" name="priority" defaultValue={priority}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t(`priorities.${p}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("internalNote")} htmlFor="note" error={fieldError("note")}>
              <Textarea id="note" name="note" rows={2} />
            </Field>
          </>
        )}
      </DialogForm>
      {status !== "CLOSED" ? <ActionForm action={updateTicketAction} hidden={{ ticketId, status: "CLOSED" }} label={t("closeTicket")} variant="ghost" /> : null}
    </div>
  );
}

export function TicketReplyForm({ ticketId, disabled }: { ticketId: string; disabled?: boolean }) {
  const t = useTranslations("admin.support");
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { formAction, fieldError } = useActionForm(replyTicketAction, {
    onSuccess: () => {
      formRef.current?.reset();
      router.refresh();
    },
  });
  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Field label={t("reply")} htmlFor="body" error={fieldError("body")}>
        <Textarea id="body" name="body" rows={4} disabled={disabled} placeholder={t("replyPlaceholder")} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox name="isInternal" label={t("internalNote")} description={t("internalNoteHint")} />
          <Select name="status" defaultValue="" className="h-8 w-auto text-xs">
            <option value="">{t("keepStatus")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t("setStatus", { status: t(`statuses.${s}`) })}
              </option>
            ))}
          </Select>
        </div>
        {disabled ? null : (
          <SubmitButton variant="primary" size="sm">
            <Send /> {t("send")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
