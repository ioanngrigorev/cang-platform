"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { saveSettingsAction } from "@/modules/admin/settings/actions";

export type SettingRow = { key: string; group: string; value: unknown; default: unknown; description: string | null; isOverridden: boolean };

export function SettingsForm({ settings, canWrite }: { settings: SettingRow[]; canWrite: boolean }) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const { state, formAction, fieldError } = useActionForm(saveSettingsAction, { onSuccess: () => router.refresh() });
  const groups = Array.from(new Set(settings.map((s) => s.group)));
  return (
    <form action={formAction} className="space-y-6">
      {groups.map((g) => (
        <Card key={g}>
          <CardHeader title={t.has(`groups.${g}`) ? t(`groups.${g}`) : g} />
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {settings
              .filter((s) => s.group === g)
              .map((s) => {
                const keyId = s.key.replace(/\./g, "_");
                const label = t.has(`keys.${keyId}`) ? t(`keys.${keyId}`) : s.key;
                const hint = `${s.key}${s.isOverridden ? ` · ${t("overridden")}` : ` · ${t("default")}`}`;
                const def = s.default;
                if (typeof def === "boolean") {
                  return (
                    <div key={s.key} className="sm:col-span-2">
                      <Checkbox name={s.key} defaultChecked={Boolean(s.value)} disabled={!canWrite} label={label} description={hint} />
                    </div>
                  );
                }
                if (typeof def === "number") {
                  return (
                    <Field key={s.key} label={label} htmlFor={s.key} hint={hint} error={fieldError(s.key)}>
                      <Input id={s.key} name={s.key} type="number" step="any" defaultValue={String(s.value ?? "")} disabled={!canWrite} />
                    </Field>
                  );
                }
                if (def && typeof def === "object") {
                  return (
                    <Field key={s.key} label={label} htmlFor={s.key} hint={hint} error={fieldError(s.key)} className="sm:col-span-2">
                      <Textarea id={s.key} name={s.key} rows={4} className="font-mono text-xs" defaultValue={JSON.stringify(s.value, null, 2)} disabled={!canWrite} />
                    </Field>
                  );
                }
                return (
                  <Field key={s.key} label={label} htmlFor={s.key} hint={hint} error={fieldError(s.key)}>
                    <Input id={s.key} name={s.key} defaultValue={String(s.value ?? "")} disabled={!canWrite} />
                  </Field>
                );
              })}
          </CardContent>
        </Card>
      ))}
      <FormError state={state} />
      {canWrite ? (
        <div className="flex justify-end">
          <SubmitButton variant="primary">
            <Save /> {t("save")}
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
