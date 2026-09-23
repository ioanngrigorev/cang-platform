"use client";

import { Check, Pause, Pencil, Play, Plus, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { campaignDecisionAction, saveAdProductAction, toggleAdProductAction } from "@/modules/admin/advertising/actions";
import { AD_PLACEMENTS, AD_PRICING } from "@/modules/admin/advertising/schemas";

export type AdProductValues = {
  id?: string;
  code?: string;
  placement?: string;
  name?: string;
  nameVi?: string;
  description?: string | null;
  pricingModel?: string;
  price?: number;
  currency?: string;
  minBudget?: number | null;
  maxSlots?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export function AdProductDialog({ values }: { values?: AdProductValues }) {
  const t = useTranslations("admin.advertising");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  return (
    <DialogForm
      action={saveAdProductAction}
      hidden={{ adProductId: values?.id }}
      title={editing ? t("editProduct") : t("newProduct")}
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
            <Plus /> {t("newProduct")}
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
            <Field label={t("placement")} htmlFor="placement" error={fieldError("placement")} required>
              <Select id="placement" name="placement" defaultValue={values?.placement ?? "FEATURED_PRODUCT"}>
                {AD_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p.replace(/_/g, " ").toLowerCase()}
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
            <Field label={t("pricingModel")} htmlFor="pricingModel" error={fieldError("pricingModel")} required>
              <Select id="pricingModel" name="pricingModel" defaultValue={values?.pricingModel ?? "FLAT_DAILY"}>
                {AD_PRICING.map((p) => (
                  <option key={p} value={p}>
                    {p.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("price")} htmlFor="price" error={fieldError("price")} required>
              <Input id="price" name="price" type="number" step="0.0001" min={0} defaultValue={values?.price ?? 0} required />
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")} required>
              <Input id="currency" name="currency" maxLength={3} defaultValue={values?.currency ?? "USD"} required />
            </Field>
            <Field label={t("minBudget")} htmlFor="minBudget" error={fieldError("minBudget")}>
              <Input id="minBudget" name="minBudget" type="number" step="0.01" min={0} defaultValue={values?.minBudget ?? ""} />
            </Field>
            <Field label={t("maxSlots")} htmlFor="maxSlots" error={fieldError("maxSlots")}>
              <Input id="maxSlots" name="maxSlots" type="number" min={0} defaultValue={values?.maxSlots ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function AdProductToggle({ adProductId, isActive }: { adProductId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleAdProductAction} hidden={{ adProductId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}

export function CampaignButtons({ campaignId, status }: { campaignId: string; status: string }) {
  const t = useTranslations("admin.advertising");
  const tc = useTranslations("admin.common");
  const withReason = (decision: "REJECTED" | "PAUSED" | "CANCELLED", label: string, icon: React.ReactNode, danger?: boolean) => (
    <DialogForm
      key={decision}
      action={campaignDecisionAction}
      hidden={{ campaignId, decision }}
      title={label}
      submitLabel={label}
      submitVariant={danger ? "danger" : "secondary"}
      cancelLabel={tc("cancel")}
      trigger={(open) => (
        <Button variant="ghost" size="xs" onClick={open}>
          {icon} {label}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required={decision === "REJECTED"}>
          <Textarea id="reason" name="reason" rows={3} required={decision === "REJECTED"} />
        </Field>
      )}
    </DialogForm>
  );
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {status === "PENDING_REVIEW" || status === "PAUSED" || status === "DRAFT" ? <ActionForm action={campaignDecisionAction} hidden={{ campaignId, decision: "ACTIVE" }} label={status === "PAUSED" ? t("resume") : t("approve")} icon={status === "PAUSED" ? <Play /> : <Check />} variant="primary" size="xs" /> : null}
      {status === "PENDING_REVIEW" ? withReason("REJECTED", t("reject"), <X />, true) : null}
      {status === "ACTIVE" ? withReason("PAUSED", t("pause"), <Pause />) : null}
      {status === "ACTIVE" || status === "PAUSED" ? withReason("CANCELLED", t("cancelCampaign"), <XCircle />, true) : null}
    </span>
  );
}
