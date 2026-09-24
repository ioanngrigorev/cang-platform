"use client";

import { Check, Copy, KeyRound, Plus, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Alert, Badge, Button, Checkbox, EmptyState, Field, Input, PageHeader, Select, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import { createApiKeyAction, revokeApiKeyAction, type CreatedApiKey } from "@/modules/seller/api-keys/actions";
import { SELLER_API_SCOPES } from "@/modules/seller/api-keys/schemas";

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

export function ApiKeysManager({ rows, locale, canManage, scopes = SELLER_API_SCOPES, title, description }: { rows: ApiKeyItem[]; locale: string; canManage: boolean; scopes?: readonly string[]; title?: string; description?: string }) {
  const t = useTranslations("seller.api");
  const [created, setCreated] = React.useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const createButton = canManage ? (
    <DialogForm<CreatedApiKey>
      action={createApiKeyAction}
      title={t("createTitle")}
      description={t("createDescription")}
      submitLabel={t("createSubmit")}
      cancelLabel={t("cancel")}
      onDone={(data) => setCreated(data)}
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open}>
          <Plus /> {t("create")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("name")} htmlFor="key-name" error={fieldError("name")} required>
            <Input id="key-name" name="name" required maxLength={80} placeholder={t("namePlaceholder")} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">{t("scopes")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {scopes.map((s) => (
                <Checkbox key={s} name="scopes[]" value={s} defaultChecked={s.endsWith(":read")} label={<code className="font-mono text-xs">{s}</code>} description={t(`scopeHints.${s.replace(":", "_")}`)} />
              ))}
            </div>
            {fieldError("scopes") ? (
              <p className="mt-1 text-xs text-danger-600" role="alert">
                {fieldError("scopes")}
              </p>
            ) : null}
          </div>
          <Field label={t("expiry")} htmlFor="key-expiry" error={fieldError("expiresInDays")}>
            <Select id="key-expiry" name="expiresInDays" defaultValue="">
              <option value="">{t("noExpiry")}</option>
              <option value="30">{t("expiryDays", { count: 30 })}</option>
              <option value="90">{t("expiryDays", { count: 90 })}</option>
              <option value="365">{t("expiryDays", { count: 365 })}</option>
            </Select>
          </Field>
        </div>
      )}
    </DialogForm>
  ) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title={title ?? t("title")} description={description ?? t("description")} actions={createButton} className="mb-0" />
      {created ? (
        <Alert variant="success" title={t("createdTitle", { name: created.name })}>
          <p className="text-sm">{t("createdBody")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-success-100 bg-surface px-3 py-1.5 font-mono text-xs text-ink-900 break-all">{created.plainKey}</code>
            <Button type="button" variant="secondary" size="xs" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? t("copied") : t("copy")}
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setCreated(null)}>
              {t("dismiss")}
            </Button>
          </div>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon={<KeyRound />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("colName")}</TH>
              <TH>{t("colPrefix")}</TH>
              <TH className="hidden md:table-cell">{t("colScopes")}</TH>
              <TH>{t("colStatus")}</TH>
              <TH className="hidden sm:table-cell">{t("colCreated")}</TH>
              <TH className="hidden lg:table-cell">{t("colLastUsed")}</TH>
              {canManage ? <TH className="text-right">{t("colActions")}</TH> : null}
            </TR>
          </THead>
          <TBody>
            {rows.map((k) => (
              <TR key={k.id}>
                <TD>
                  <p className="font-medium text-ink-900">{k.name}</p>
                  {k.createdBy ? <p className="text-xs text-steel-500">{t("createdBy", { name: k.createdBy })}</p> : null}
                </TD>
                <TD>
                  <code className="font-mono text-xs text-steel-700">cang_{k.prefix}_…</code>
                </TD>
                <TD className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="outline" size="sm">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD>
                  <StatusBadge status={k.status} label={t(`statuses.${k.status}`)} />
                  {k.expiresAt && k.status === "ACTIVE" ? <p className="mt-0.5 text-xs text-steel-500">{t("expires", { date: formatDate(k.expiresAt, locale) })}</p> : null}
                  {k.revokedAt ? <p className="mt-0.5 text-xs text-steel-500">{formatDate(k.revokedAt, locale)}</p> : null}
                </TD>
                <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(k.createdAt, locale)}</TD>
                <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{k.lastUsedAt ? formatDateTime(k.lastUsedAt, locale) : t("neverUsed")}</TD>
                {canManage ? (
                  <TD className="text-right">{k.status === "ACTIVE" ? <ActionForm action={revokeApiKeyAction} hidden={{ apiKeyId: k.id }} label={t("revoke")} icon={<ShieldOff />} variant="ghost" size="xs" /> : null}</TD>
                ) : null}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
