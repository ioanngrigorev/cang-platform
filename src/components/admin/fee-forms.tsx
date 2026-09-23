"use client";

import { Check, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveFeeRuleAction, setCommissionStatusAction, toggleFeeRuleAction } from "@/modules/admin/fees/actions";
import { COMMISSION_STATUSES, FEE_CALCS, FEE_TYPES, PAID_BY } from "@/modules/admin/fees/schemas";

export type FeeRuleValues = {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  calc?: string;
  value?: number;
  tiers?: unknown;
  currency?: string;
  minFee?: number | null;
  maxFee?: number | null;
  planId?: string | null;
  categorySlug?: string | null;
  countryCode?: string | null;
  paidBy?: string;
  priority?: number;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  description?: string | null;
};

export function FeeRuleDialog({ values, plans }: { values?: FeeRuleValues; plans: Array<{ id: string; name: string }> }) {
  const t = useTranslations("admin.fees");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  return (
    <DialogForm
      action={saveFeeRuleAction}
      hidden={{ feeRuleId: values?.id }}
      title={editing ? t("editRule") : t("newRule")}
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
            <Plus /> {t("newRule")}
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
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={values?.name ?? ""} required />
            </Field>
            <Field label={t("type")} htmlFor="type" error={fieldError("type")} required>
              <Select id="type" name="type" defaultValue={values?.type ?? "TRANSACTION_COMMISSION"}>
                {FEE_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {x.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("calc")} htmlFor="calc" error={fieldError("calc")} required>
              <Select id="calc" name="calc" defaultValue={values?.calc ?? "PERCENTAGE"}>
                {FEE_CALCS.map((x) => (
                  <option key={x} value={x}>
                    {t(`calcs.${x}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("value")} htmlFor="value" error={fieldError("value")} hint={t("valueHint")} required>
              <Input id="value" name="value" type="number" step="0.0001" min={0} defaultValue={values?.value ?? 0} required />
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")} required>
              <Input id="currency" name="currency" maxLength={3} defaultValue={values?.currency ?? "USD"} required />
            </Field>
            <Field label={t("minFee")} htmlFor="minFee" error={fieldError("minFee")}>
              <Input id="minFee" name="minFee" type="number" step="0.01" min={0} defaultValue={values?.minFee ?? ""} />
            </Field>
            <Field label={t("maxFee")} htmlFor="maxFee" error={fieldError("maxFee")}>
              <Input id="maxFee" name="maxFee" type="number" step="0.01" min={0} defaultValue={values?.maxFee ?? ""} />
            </Field>
            <Field label={t("plan")} htmlFor="planId" error={fieldError("planId")}>
              <Select id="planId" name="planId" defaultValue={values?.planId ?? ""}>
                <option value="">{t("allPlans")}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("categorySlug")} htmlFor="categorySlug" error={fieldError("categorySlug")}>
              <Input id="categorySlug" name="categorySlug" defaultValue={values?.categorySlug ?? ""} />
            </Field>
            <Field label={t("countryCode")} htmlFor="countryCode" error={fieldError("countryCode")}>
              <Input id="countryCode" name="countryCode" maxLength={2} defaultValue={values?.countryCode ?? ""} />
            </Field>
            <Field label={t("paidBy")} htmlFor="paidBy" error={fieldError("paidBy")}>
              <Select id="paidBy" name="paidBy" defaultValue={values?.paidBy ?? "SELLER"}>
                {PAID_BY.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("priority")} htmlFor="priority" error={fieldError("priority")}>
              <Input id="priority" name="priority" type="number" defaultValue={values?.priority ?? 0} />
            </Field>
            <Field label={t("validFrom")} htmlFor="validFrom" error={fieldError("validFrom")}>
              <Input id="validFrom" name="validFrom" type="date" defaultValue={values?.validFrom ?? ""} />
            </Field>
            <Field label={t("validTo")} htmlFor="validTo" error={fieldError("validTo")}>
              <Input id="validTo" name="validTo" type="date" defaultValue={values?.validTo ?? ""} />
            </Field>
          </div>
          <Field label={t("tiers")} htmlFor="tiers" error={fieldError("tiers")} hint={t("tiersHint")}>
            <Textarea id="tiers" name="tiers" rows={3} className="font-mono text-xs" defaultValue={values?.tiers ? JSON.stringify(values.tiers, null, 2) : ""} />
          </Field>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function FeeRuleToggle({ feeRuleId, isActive }: { feeRuleId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleFeeRuleAction} hidden={{ feeRuleId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}

export function CommissionStatusButtons({ commissionId, status }: { commissionId: string; status: string }) {
  const t = useTranslations("admin.fees");
  const tc = useTranslations("admin.common");
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {status === "PENDING" || status === "INVOICED" ? <ActionForm action={setCommissionStatusAction} hidden={{ commissionId, status: "COLLECTED" }} label={t("markSettled")} icon={<Check />} variant="primary" size="xs" /> : null}
      <DialogForm
        action={setCommissionStatusAction}
        hidden={{ commissionId }}
        title={t("changeStatus")}
        submitLabel={tc("save")}
        cancelLabel={tc("cancel")}
        trigger={(open) => (
          <Button variant="ghost" size="xs" onClick={open}>
            <Pencil /> {tc("edit")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field label={tc("status")} htmlFor="status" error={fieldError("status")}>
              <Select id="status" name="status" defaultValue={status}>
                {COMMISSION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
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
    </span>
  );
}
