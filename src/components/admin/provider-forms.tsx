"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveFinancingProviderAction, saveInspectionProviderAction, savePaymentProviderAction, toggleProviderAction } from "@/modules/admin/providers/actions";
import { FINANCING_PRODUCTS, FINANCING_PROVIDER_TYPES, INSPECTION_TYPES, PAYMENT_METHODS, PAYMENT_PROVIDER_TYPES } from "@/modules/admin/providers/schemas";

type Trigger = (open: () => void) => React.ReactNode;

function useTrigger(editing: boolean, newLabel: string): Trigger {
  const tc = useTranslations("admin.common");
  return (open) =>
    editing ? (
      <Button variant="ghost" size="xs" onClick={open}>
        <Pencil /> {tc("edit")}
      </Button>
    ) : (
      <Button variant="primary" size="sm" onClick={open}>
        <Plus /> {newLabel}
      </Button>
    );
}

const json = (v: unknown) => (v ? JSON.stringify(v, null, 2) : "");

export type PaymentProviderValues = {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  description?: string | null;
  adapterCode?: string;
  supportedMethods?: string[];
  supportedCurrencies?: string[];
  supportedCountries?: string[];
  supportsEscrow?: boolean;
  licenseInfo?: string | null;
  publicConfig?: unknown;
  feeConfig?: { percent?: number; fixed?: number; currency?: string } | null;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

export function PaymentProviderDialog({ values }: { values?: PaymentProviderValues }) {
  const t = useTranslations("admin.providers");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useTrigger(editing, t("newPayment"));
  return (
    <DialogForm action={savePaymentProviderAction} hidden={{ providerId: values?.id }} title={editing ? t("editProvider") : t("newPayment")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="lg" trigger={trigger}>
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
              <Select id="type" name="type" defaultValue={values?.type ?? "BANK_TRANSFER"}>
                {PAYMENT_PROVIDER_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {x.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("adapter")} htmlFor="adapterCode" error={fieldError("adapterCode")}>
              <Input id="adapterCode" name="adapterCode" defaultValue={values?.adapterCode ?? "manual_bank_transfer"} />
            </Field>
            <Field label={t("currencies")} htmlFor="supportedCurrencies" error={fieldError("supportedCurrencies")} hint={t("listHint")}>
              <Input id="supportedCurrencies" name="supportedCurrencies" defaultValue={values?.supportedCurrencies?.join(", ") ?? ""} />
            </Field>
            <Field label={t("countries")} htmlFor="supportedCountries" error={fieldError("supportedCountries")} hint={t("listHint")}>
              <Input id="supportedCountries" name="supportedCountries" defaultValue={values?.supportedCountries?.join(", ") ?? ""} />
            </Field>
            <Field label={t("feePercent")} htmlFor="feePercent" error={fieldError("feePercent")}>
              <Input id="feePercent" name="feePercent" type="number" step="0.01" min={0} defaultValue={values?.feeConfig?.percent ?? ""} />
            </Field>
            <Field label={t("feeFixed")} htmlFor="feeFixed" error={fieldError("feeFixed")}>
              <Input id="feeFixed" name="feeFixed" type="number" step="0.01" min={0} defaultValue={values?.feeConfig?.fixed ?? ""} />
            </Field>
            <Field label={t("feeCurrency")} htmlFor="feeCurrency" error={fieldError("feeCurrency")}>
              <Input id="feeCurrency" name="feeCurrency" maxLength={3} defaultValue={values?.feeConfig?.currency ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("methods")} error={fieldError("supportedMethods")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((m) => (
                <Checkbox key={m} name="supportedMethods[]" value={m} defaultChecked={values?.supportedMethods?.includes(m)} label={m.replace(/_/g, " ").toLowerCase()} />
              ))}
            </div>
          </Field>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("licenseInfo")} htmlFor="licenseInfo" error={fieldError("licenseInfo")}>
            <Input id="licenseInfo" name="licenseInfo" defaultValue={values?.licenseInfo ?? ""} />
          </Field>
          <Field label={t("publicConfig")} htmlFor="publicConfig" error={fieldError("publicConfig")} hint={t("configHint")}>
            <Textarea id="publicConfig" name="publicConfig" rows={5} className="font-mono text-xs" defaultValue={json(values?.publicConfig)} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox name="supportsEscrow" defaultChecked={values?.supportsEscrow ?? false} label={t("supportsEscrow")} />
            <Checkbox name="isDefault" defaultChecked={values?.isDefault ?? false} label={t("isDefault")} />
            <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
          </div>
        </>
      )}
    </DialogForm>
  );
}

export type FinancingProviderValues = {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  description?: string | null;
  licenseNumber?: string | null;
  regulator?: string | null;
  products?: string[];
  countries?: string[];
  currencies?: string[];
  minAmount?: number | null;
  maxAmount?: number | null;
  minTenorDays?: number | null;
  maxTenorDays?: number | null;
  indicativeRate?: string | null;
  adapterCode?: string;
  apiConfig?: unknown;
  routingRules?: unknown;
  isActive?: boolean;
  sortOrder?: number;
};

export function FinancingProviderDialog({ values }: { values?: FinancingProviderValues }) {
  const t = useTranslations("admin.providers");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useTrigger(editing, t("newFinancing"));
  return (
    <DialogForm action={saveFinancingProviderAction} hidden={{ providerId: values?.id }} title={editing ? t("editProvider") : t("newFinancing")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="lg" trigger={trigger}>
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
              <Select id="type" name="type" defaultValue={values?.type ?? "BANK"}>
                {FINANCING_PROVIDER_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {x.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("adapter")} htmlFor="adapterCode" error={fieldError("adapterCode")}>
              <Input id="adapterCode" name="adapterCode" defaultValue={values?.adapterCode ?? "manual"} />
            </Field>
            <Field label={t("regulator")} htmlFor="regulator" error={fieldError("regulator")}>
              <Input id="regulator" name="regulator" defaultValue={values?.regulator ?? ""} />
            </Field>
            <Field label={t("licenseNumber")} htmlFor="licenseNumber" error={fieldError("licenseNumber")}>
              <Input id="licenseNumber" name="licenseNumber" defaultValue={values?.licenseNumber ?? ""} />
            </Field>
            <Field label={t("countries")} htmlFor="countries" error={fieldError("countries")} hint={t("listHint")}>
              <Input id="countries" name="countries" defaultValue={values?.countries?.join(", ") ?? ""} />
            </Field>
            <Field label={t("currencies")} htmlFor="currencies" error={fieldError("currencies")} hint={t("listHint")}>
              <Input id="currencies" name="currencies" defaultValue={values?.currencies?.join(", ") ?? ""} />
            </Field>
            <Field label={t("minAmount")} htmlFor="minAmount" error={fieldError("minAmount")}>
              <Input id="minAmount" name="minAmount" type="number" step="0.01" min={0} defaultValue={values?.minAmount ?? ""} />
            </Field>
            <Field label={t("maxAmount")} htmlFor="maxAmount" error={fieldError("maxAmount")}>
              <Input id="maxAmount" name="maxAmount" type="number" step="0.01" min={0} defaultValue={values?.maxAmount ?? ""} />
            </Field>
            <Field label={t("minTenor")} htmlFor="minTenorDays" error={fieldError("minTenorDays")}>
              <Input id="minTenorDays" name="minTenorDays" type="number" min={0} defaultValue={values?.minTenorDays ?? ""} />
            </Field>
            <Field label={t("maxTenor")} htmlFor="maxTenorDays" error={fieldError("maxTenorDays")}>
              <Input id="maxTenorDays" name="maxTenorDays" type="number" min={0} defaultValue={values?.maxTenorDays ?? ""} />
            </Field>
            <Field label={t("indicativeRate")} htmlFor="indicativeRate" error={fieldError("indicativeRate")}>
              <Input id="indicativeRate" name="indicativeRate" defaultValue={values?.indicativeRate ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("products")} error={fieldError("products")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FINANCING_PRODUCTS.map((m) => (
                <Checkbox key={m} name="products[]" value={m} defaultChecked={values?.products?.includes(m)} label={m.replace(/_/g, " ").toLowerCase()} />
              ))}
            </div>
          </Field>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("routingRules")} htmlFor="routingRules" error={fieldError("routingRules")} hint={t("routingRulesHint")}>
            <Textarea id="routingRules" name="routingRules" rows={3} className="font-mono text-xs" defaultValue={json(values?.routingRules)} />
          </Field>
          <Field label={t("apiConfig")} htmlFor="apiConfig" error={fieldError("apiConfig")} hint={t("configHint")}>
            <Textarea id="apiConfig" name="apiConfig" rows={3} className="font-mono text-xs" defaultValue={json(values?.apiConfig)} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export type InspectionProviderValues = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  services?: string[];
  countries?: string[];
  adapterCode?: string;
  apiConfig?: unknown;
  isActive?: boolean;
  sortOrder?: number;
};

export function InspectionProviderDialog({ values }: { values?: InspectionProviderValues }) {
  const t = useTranslations("admin.providers");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useTrigger(editing, t("newInspection"));
  return (
    <DialogForm action={saveInspectionProviderAction} hidden={{ providerId: values?.id }} title={editing ? t("editProvider") : t("newInspection")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="lg" trigger={trigger}>
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("code")} htmlFor="code" error={fieldError("code")} required>
              <Input id="code" name="code" defaultValue={values?.code ?? ""} required />
            </Field>
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={values?.name ?? ""} required />
            </Field>
            <Field label={t("adapter")} htmlFor="adapterCode" error={fieldError("adapterCode")}>
              <Input id="adapterCode" name="adapterCode" defaultValue={values?.adapterCode ?? "manual"} />
            </Field>
            <Field label={t("countries")} htmlFor="countries" error={fieldError("countries")} hint={t("listHint")}>
              <Input id="countries" name="countries" defaultValue={values?.countries?.join(", ") ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("services")} error={fieldError("services")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INSPECTION_TYPES.map((m) => (
                <Checkbox key={m} name="services[]" value={m} defaultChecked={values?.services?.includes(m)} label={m.replace(/_/g, " ").toLowerCase()} />
              ))}
            </div>
          </Field>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("apiConfig")} htmlFor="apiConfig" error={fieldError("apiConfig")} hint={t("configHint")}>
            <Textarea id="apiConfig" name="apiConfig" rows={3} className="font-mono text-xs" defaultValue={json(values?.apiConfig)} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function ProviderToggle({ providerId, kind, isActive }: { providerId: string; kind: "payment" | "logistics" | "financing" | "inspection"; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleProviderAction} hidden={{ providerId, kind, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}
