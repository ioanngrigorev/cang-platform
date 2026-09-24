import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CarrierCredentialsForm, WebhookTokenCard } from "@/components/partner/partner-forms";
import { ApiKeysManager } from "@/components/seller/api-keys-manager";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { absoluteUrl } from "@/lib/utils";
import { canCompany, getAuth } from "@/modules/auth/current-user";
import { requirePartner } from "@/modules/partner/context";
import { listApiKeys } from "@/modules/seller/api-keys/queries";
import { PARTNER_API_SCOPES } from "@/modules/seller/api-keys/schemas";

export const metadata: Metadata = { title: "Integrations", robots: { index: false } };

const mask = (v: unknown) => (typeof v === "string" && v.length > 4 ? `••••${v.slice(-4)}` : null);

export default async function PartnerIntegrationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company, provider, membership } = await requirePartner();
  const auth = await getAuth();
  const canManage = canCompany(auth, "company.apikeys.manage") || membership.role === "OWNER" || membership.role === "ADMIN";
  const t = await getTranslations("partner.integrations");
  const rows = await listApiKeys(company.id);
  const cfg = (provider.apiConfig ?? {}) as Record<string, unknown>;
  const ghn = (cfg.ghn ?? {}) as Record<string, unknown>;
  const ghtk = (cfg.ghtk ?? {}) as Record<string, unknown>;
  const base = absoluteUrl("").replace(/\/$/, "");

  return (
    <>
      <ApiKeysManager
        locale={locale}
        canManage={canManage}
        scopes={PARTNER_API_SCOPES}
        title={t("title")}
        description={t("description")}
        rows={rows.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes,
          status: k.status,
          lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
          expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
          revokedAt: k.revokedAt ? k.revokedAt.toISOString() : null,
          createdAt: k.createdAt.toISOString(),
          createdBy: k.createdBy?.name ?? null,
        }))}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("apiTitle")} description={t("apiHint")} />
          <CardContent className="space-y-3 text-sm text-steel-700">
            <p>{t("apiEndpoints")}</p>
            <pre className="overflow-x-auto rounded-md border border-steel-200 bg-steel-50 p-3 font-mono text-xs leading-relaxed text-ink-900">{`GET  ${base}/api/partner/v1/shipments?status=active
GET  ${base}/api/partner/v1/shipments/SHP-2026-XXXXXX
POST ${base}/api/partner/v1/shipments/SHP-2026-XXXXXX/events
PUT  ${base}/api/partner/v1/shipments/SHP-2026-XXXXXX/tracking`}</pre>
            <p>{t("apiExample")}</p>
            <pre className="overflow-x-auto rounded-md border border-steel-200 bg-steel-50 p-3 font-mono text-xs leading-relaxed text-ink-900">{`curl -X POST ${base}/api/partner/v1/shipments/SHP-2026-XXXXXX/events \\
  -H "Authorization: Bearer cang_xxxx_…" -H "Content-Type: application/json" \\
  -d '{"status":"DELIVERED","receiver_name":"Nguyen Van A",
       "location":"Kho KCN Tan Tao","occurred_at":"2026-09-24T09:30:00+07:00",
       "external_id":"TMS-88121"}'`}</pre>
            <p className="text-xs text-steel-500">{t("apiStatuses")}</p>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("webhookTitle")} description={t("webhookHint")} />
            <CardContent>
              <WebhookTokenCard baseUrl={base} providerCode={provider.code} hasToken={typeof cfg.webhookTokenHash === "string"} canManage={canManage} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("credentialsTitle")} description={t("credentialsHint")} />
            <CardContent>
              <CarrierCredentialsForm canManage={canManage} saved={{ ghn: mask(ghn.token), ghnShopId: typeof ghn.shopId === "string" ? ghn.shopId : null, ghtk: mask(ghtk.token) }} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
