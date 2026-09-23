"use client";

import { Check, Pencil, Plus, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { approveSubscriptionAction, cancelSubscriptionAction, savePlanAction } from "@/modules/admin/plans/actions";
import { PLAN_TIERS } from "@/modules/admin/plans/schemas";

export type PlanValues = {
  id?: string;
  code?: string;
  tier?: string;
  name?: string;
  nameVi?: string;
  description?: string | null;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  features?: unknown;
  limits?: unknown;
  isPublic?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export function PlanDialog({ values }: { values?: PlanValues }) {
  const t = useTranslations("admin.plans");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  return (
    <DialogForm
      action={savePlanAction}
      hidden={{ planId: values?.id }}
      title={editing ? t("editPlan") : t("newPlan")}
      submitLabel={editing ? tc("save") : tc("create")}
      cancelLabel={tc("cancel")}
      size="lg"
      trigger={(open) =>
        editing ? (
          <Button variant="ghost" size="xs" onClick={open}>
            <Pencil /> {tc("edit")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={open}>
            <Plus /> {t("newPlan")}
          </Button>
        )
      }
    >
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("code")} htmlFor="code" error={fieldError("code")} required>
              <Input id="code" name="code" defaultValue={values?.code ?? ""} required />
            </Field>
            <Field label={t("tier")} htmlFor="tier" error={fieldError("tier")} required>
              <Select id="tier" name="tier" defaultValue={values?.tier ?? "PRO"}>
                {PLAN_TIERS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={values?.name ?? ""} required />
            </Field>
            <Field label={t("nameVi")} htmlFor="nameVi" error={fieldError("nameVi")} required>
              <Input id="nameVi" name="nameVi" defaultValue={values?.nameVi ?? ""} required />
            </Field>
            <Field label={t("priceMonthly")} htmlFor="priceMonthly" error={fieldError("priceMonthly")} required>
              <Input id="priceMonthly" name="priceMonthly" type="number" step="0.01" min={0} defaultValue={values?.priceMonthly ?? 0} required />
            </Field>
            <Field label={t("priceYearly")} htmlFor="priceYearly" error={fieldError("priceYearly")} required>
              <Input id="priceYearly" name="priceYearly" type="number" step="0.01" min={0} defaultValue={values?.priceYearly ?? 0} required />
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")} required>
              <Input id="currency" name="currency" maxLength={3} defaultValue={values?.currency ?? "USD"} required />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("features")} htmlFor="features" error={fieldError("features")} hint={t("featuresHint")}>
            <Textarea id="features" name="features" rows={4} className="font-mono text-xs" defaultValue={values?.features ? JSON.stringify(values.features, null, 2) : "[]"} />
          </Field>
          <Field label={t("limits")} htmlFor="limits" error={fieldError("limits")} hint={t("limitsHint")}>
            <Textarea id="limits" name="limits" rows={6} className="font-mono text-xs" defaultValue={values?.limits ? JSON.stringify(values.limits, null, 2) : ""} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox name="isPublic" defaultChecked={values?.isPublic ?? true} label={t("isPublic")} />
            <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
          </div>
        </>
      )}
    </DialogForm>
  );
}

export function SubscriptionButtons({ subscriptionId, status, isRequest }: { subscriptionId: string; status: string; isRequest: boolean }) {
  const t = useTranslations("admin.plans");
  const tc = useTranslations("admin.common");
  const live = status === "ACTIVE" || status === "TRIALING" || status === "PAST_DUE";
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {status !== "ACTIVE" && status !== "CANCELLED" && status !== "EXPIRED" ? (
        <DialogForm
          action={approveSubscriptionAction}
          hidden={{ subscriptionId }}
          title={isRequest ? t("approveUpgrade") : t("activate")}
          description={t("approveHint")}
          submitLabel={isRequest ? t("approveUpgrade") : t("activate")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="primary" size="xs" onClick={open}>
              <Check /> {isRequest ? t("approveUpgrade") : t("activate")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("note")} htmlFor="note" error={fieldError("note")}>
              <Textarea id="note" name="note" rows={2} />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {status === "EXPIRED" || status === "CANCELLED" ? <ActionForm action={approveSubscriptionAction} hidden={{ subscriptionId }} label={t("reactivate")} icon={<Check />} size="xs" /> : null}
      {live ? (
        <DialogForm
          action={cancelSubscriptionAction}
          hidden={{ subscriptionId }}
          title={isRequest ? t("declineRequest") : t("cancelSubscription")}
          submitLabel={isRequest ? t("declineRequest") : t("cancelSubscription")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="ghost" size="xs" onClick={open}>
              <XCircle /> {isRequest ? t("declineRequest") : t("cancelSubscription")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              {status === "ACTIVE" ? (
                <Field label={t("cancelMode")} htmlFor="mode" error={fieldError("mode")}>
                  <Select id="mode" name="mode" defaultValue="PERIOD_END">
                    <option value="PERIOD_END">{t("cancelAtPeriodEnd")}</option>
                    <option value="NOW">{t("cancelNow")}</option>
                  </Select>
                </Field>
              ) : null}
              <Field label={tc("note")} htmlFor="note" error={fieldError("note")}>
                <Textarea id="note" name="note" rows={2} />
              </Field>
            </>
          )}
        </DialogForm>
      ) : null}
    </span>
  );
}
