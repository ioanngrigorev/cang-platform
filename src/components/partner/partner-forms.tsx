"use client";

import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Alert, Button, Checkbox, Field, FormError, Input, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { LOGISTICS_SERVICES } from "@/modules/admin/logistics/schemas";
import { SHIPMENT_MODES } from "@/modules/logistics/tracking/statuses";
import { partnerRotateWebhookTokenAction, partnerSaveCarrierCredentialsAction, partnerSaveProfileAction } from "@/modules/partner/actions";

export function PartnerProfileForm({
  defaults,
  canEdit,
}: {
  defaults: { description: string | null; services: string[]; modes: string[]; countries: string[]; phone: string | null; email: string | null; website: string | null; address: string | null };
  canEdit: boolean;
}) {
  const t = useTranslations("partner.profile");
  const ts = useTranslations("logistics.services");
  const tm = useTranslations("logistics.modes");
  const { state, formAction, fieldError } = useActionForm(partnerSaveProfileAction);
  return (
    <form action={formAction} className="space-y-6">
      <fieldset disabled={!canEdit} className="space-y-6">
        <Field label={t("about")} htmlFor="pp-description" error={fieldError("description")} hint={t("aboutHint")}>
          <Textarea id="pp-description" name="description" rows={4} defaultValue={defaults.description ?? ""} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-900">{t("services")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LOGISTICS_SERVICES.map((s) => (
              <Checkbox key={s} name="services[]" value={s} defaultChecked={defaults.services.includes(s)} label={ts(s)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-900">{t("modes")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SHIPMENT_MODES.map((m) => (
              <Checkbox key={m} name="modes[]" value={m} defaultChecked={defaults.modes.includes(m)} label={tm(m)} />
            ))}
          </div>
        </div>
        <Field label={t("countries")} htmlFor="pp-countries" error={fieldError("countries")} hint={t("countriesHint")}>
          <Input id="pp-countries" name="countries" defaultValue={defaults.countries.join(", ")} placeholder="VN, CN, US, DE" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("phone")} htmlFor="pp-phone" error={fieldError("phone")}>
            <Input id="pp-phone" name="phone" type="tel" defaultValue={defaults.phone ?? ""} />
          </Field>
          <Field label={t("email")} htmlFor="pp-email" error={fieldError("email")}>
            <Input id="pp-email" name="email" type="email" defaultValue={defaults.email ?? ""} />
          </Field>
          <Field label={t("website")} htmlFor="pp-website" error={fieldError("website")}>
            <Input id="pp-website" name="website" defaultValue={defaults.website ?? ""} />
          </Field>
          <Field label={t("address")} htmlFor="pp-address" error={fieldError("address")}>
            <Input id="pp-address" name="address" defaultValue={defaults.address ?? ""} />
          </Field>
        </div>
      </fieldset>
      <FormError state={state} />
      {canEdit ? <SubmitButton>{t("save")}</SubmitButton> : null}
    </form>
  );
}

/** Webhook token for GHN / GHTK callbacks: shown once after rotation, with the ready-to-paste URLs. */
export function WebhookTokenCard({ baseUrl, providerCode, hasToken, canManage }: { baseUrl: string; providerCode: string; hasToken: boolean; canManage: boolean }) {
  const t = useTranslations("partner.integrations");
  const [token, setToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const { formAction, pending } = useActionForm(partnerRotateWebhookTokenAction, { onSuccess: (d) => setToken(d.token) });
  const url = (carrier: string) => `${baseUrl}/api/logistics/webhooks/${carrier}/${providerCode}?token=${token ?? "…"}`;
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }
  return (
    <div className="space-y-3">
      {token ? (
        <Alert variant="success" title={t("tokenCreated")}>
          {t("tokenCreatedHint")}
        </Alert>
      ) : null}
      {(["ghn", "ghtk"] as const).map((c) => (
        <div key={c}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-500">{c === "ghn" ? "GHN" : "GHTK"}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-steel-200 bg-steel-50 px-3 py-2 font-mono text-xs text-ink-900">{url(c)}</code>
            {token ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => copy(url(c))}>
                {copied === url(c) ? <Check /> : <Copy />}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      {!token ? <p className="text-xs text-steel-500">{hasToken ? t("tokenHidden") : t("tokenNone")}</p> : null}
      {canManage ? (
        <form action={formAction}>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {hasToken || token ? <RefreshCw /> : <KeyRound />} {hasToken || token ? t("rotate") : t("createToken")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function CarrierCredentialsForm({ saved, canManage }: { saved: { ghn: string | null; ghnShopId: string | null; ghtk: string | null }; canManage: boolean }) {
  const t = useTranslations("partner.integrations");
  const { state, formAction, fieldError } = useActionForm(partnerSaveCarrierCredentialsAction);
  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("ghnToken")} htmlFor="cc-ghn" error={fieldError("ghnToken")} hint={saved.ghn ? t("savedAs", { value: saved.ghn }) : undefined}>
          <Input id="cc-ghn" name="ghnToken" type="password" autoComplete="off" placeholder={saved.ghn ? "••••••••" : ""} />
        </Field>
        <Field label={t("ghnShopId")} htmlFor="cc-ghn-shop" error={fieldError("ghnShopId")}>
          <Input id="cc-ghn-shop" name="ghnShopId" defaultValue={saved.ghnShopId ?? ""} />
        </Field>
        <Field label={t("ghtkToken")} htmlFor="cc-ghtk" error={fieldError("ghtkToken")} hint={saved.ghtk ? t("savedAs", { value: saved.ghtk }) : undefined}>
          <Input id="cc-ghtk" name="ghtkToken" type="password" autoComplete="off" placeholder={saved.ghtk ? "••••••••" : ""} />
        </Field>
      </fieldset>
      <FormError state={state} />
      {canManage ? <SubmitButton size="sm">{t("saveCredentials")}</SubmitButton> : null}
    </form>
  );
}
