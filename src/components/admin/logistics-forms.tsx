"use client";

import { Pencil, Plus, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { StatusUpdateDialog } from "@/components/logistics/status-update-dialog";
import { addShipmentEventAction, assignShipmentPartnerAction, saveLogisticsProviderAction, toggleLogisticsProviderAction } from "@/modules/admin/logistics/actions";
import { LOGISTICS_SERVICES, SHIPMENT_MODES, SHIPMENT_STATUSES } from "@/modules/admin/logistics/schemas";

export type LogisticsProviderValues = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  services?: string[];
  modes?: string[];
  countries?: string[];
  adapterCode?: string;
  apiConfig?: unknown;
  sortOrder?: number;
  isActive?: boolean;
  companySlug?: string | null;
};

export function LogisticsProviderDialog({ values }: { values?: LogisticsProviderValues }) {
  const t = useTranslations("admin.logistics");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  return (
    <DialogForm
      action={saveLogisticsProviderAction}
      hidden={{ providerId: values?.id }}
      title={editing ? t("editProvider") : t("newProvider")}
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
            <Plus /> {t("newProvider")}
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
            <Field label={t("adapter")} htmlFor="adapterCode" error={fieldError("adapterCode")}>
              <Input id="adapterCode" name="adapterCode" defaultValue={values?.adapterCode ?? "manual"} />
            </Field>
            <Field label={t("countries")} htmlFor="countries" error={fieldError("countries")} hint={t("countriesHint")}>
              <Input id="countries" name="countries" defaultValue={values?.countries?.join(", ") ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
            <Field label={t("partnerCompany")} htmlFor="companySlug" error={fieldError("companySlug")} hint={t("partnerCompanyHint")}>
              <Input id="companySlug" name="companySlug" defaultValue={values?.companySlug ?? ""} placeholder="saigon-freight-solutions" />
            </Field>
          </div>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("services")} error={fieldError("services")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LOGISTICS_SERVICES.map((s) => (
                <Checkbox key={s} name="services[]" value={s} defaultChecked={values?.services?.includes(s)} label={s.replace(/_/g, " ").toLowerCase()} />
              ))}
            </div>
          </Field>
          <Field label={t("modes")} error={fieldError("modes")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHIPMENT_MODES.map((m) => (
                <Checkbox key={m} name="modes[]" value={m} defaultChecked={values?.modes?.includes(m)} label={m.replace(/_/g, " ")} />
              ))}
            </div>
          </Field>
          <Field label={t("apiConfig")} htmlFor="apiConfig" error={fieldError("apiConfig")} hint={t("apiConfigHint")}>
            <Textarea id="apiConfig" name="apiConfig" rows={4} className="font-mono text-xs" defaultValue={values?.apiConfig ? JSON.stringify(values.apiConfig, null, 2) : ""} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function LogisticsProviderToggle({ providerId, isActive, approve = false }: { providerId: string; isActive: boolean; approve?: boolean }) {
  const tc = useTranslations("admin.common");
  const t = useTranslations("admin.logistics");
  return <ActionForm action={toggleLogisticsProviderAction} hidden={{ providerId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : approve ? t("approvePartner") : tc("activate")} variant={approve ? "primary" : "ghost"} size="xs" />;
}

/** Admin status override: every status is available (CANG operations can correct any shipment). */
export function ShipmentEventDialog({ shipmentId }: { shipmentId: string; status?: string }) {
  return <StatusUpdateDialog action={addShipmentEventAction} shipmentId={shipmentId} allowed={SHIPMENT_STATUSES.filter((s) => s !== "PENDING")} uploads={false} size="sm" variant="secondary" />;
}

/** Hand a shipment to a logistics partner (or take it back). */
export function AssignPartnerDialog({ shipmentId, providerId, providers }: { shipmentId: string; providerId: string | null; providers: Array<{ id: string; name: string; isActive: boolean }> }) {
  const t = useTranslations("admin.logistics");
  const tt = useTranslations("tracking");
  const tc = useTranslations("admin.common");
  return (
    <DialogForm
      action={assignShipmentPartnerAction}
      hidden={{ shipmentId }}
      title={t("assignPartner")}
      description={tt("partner.chooseHint")}
      submitLabel={tc("save")}
      cancelLabel={tc("cancel")}
      trigger={(open) => (
        <Button variant="ghost" size="xs" onClick={open}>
          <Truck /> {t("assignPartner")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <Field label={tt("partner.choose")} htmlFor="assign-provider" error={fieldError("providerId")}>
          <Select id="assign-provider" name="providerId" defaultValue={providerId ?? ""}>
            <option value="">{tt("partner.none")}</option>
            {providers.filter((p) => p.isActive || p.id === providerId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </DialogForm>
  );
}
