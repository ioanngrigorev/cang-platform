"use client";

import { ArrowUpRight, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { cancelUpgradeRequestAction, requestUpgradeAction } from "@/modules/seller/subscription/actions";

export function RequestUpgradeButton({ planId, planName, disabled }: { planId: string; planName: string; disabled?: boolean }) {
  const t = useTranslations("seller.subscription");
  return (
    <DialogForm
      action={requestUpgradeAction}
      title={t("requestTitle", { plan: planName })}
      description={t("requestDescription")}
      submitLabel={t("requestSubmit")}
      cancelLabel={t("cancel")}
      hidden={{ planId }}
      trigger={(open) => (
        <Button type="button" variant="primary" size="sm" onClick={open} disabled={disabled} className="w-full">
          {t("choosePlan")} <ArrowUpRight />
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("billingCycle")} htmlFor={`cycle-${planId}`} error={fieldError("billingCycle")}>
            <Select id={`cycle-${planId}`} name="billingCycle" defaultValue="monthly">
              <option value="monthly">{t("monthly")}</option>
              <option value="yearly">{t("yearly")}</option>
            </Select>
          </Field>
          <Field label={t("note")} htmlFor={`note-${planId}`} error={fieldError("note")} hint={t("noteHint")}>
            <Textarea id={`note-${planId}`} name="note" rows={3} maxLength={500} />
          </Field>
        </div>
      )}
    </DialogForm>
  );
}

export function WithdrawUpgradeButton({ subscriptionId }: { subscriptionId: string }) {
  const t = useTranslations("seller.subscription");
  return <ActionForm action={cancelUpgradeRequestAction} hidden={{ subscriptionId }} label={t("withdraw")} icon={<Undo2 />} variant="secondary" size="sm" />;
}
