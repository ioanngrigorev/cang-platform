import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiKeysManager } from "@/components/seller/api-keys-manager";
import { Alert, Card, CardContent, CardHeader, PageHeader } from "@/components/ui";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { listApiKeys } from "@/modules/seller/api-keys/queries";
import { currentSubscription } from "@/modules/seller/subscription/queries";

export const metadata: Metadata = { title: "API access", robots: { index: false } };

export default async function SellerApiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company, membership } = await requireCompany({ permission: "company.profile.read", seller: true });
  const auth = await getAuth();
  const canManage = canCompany(auth, "company.apikeys.manage") || membership.role === "OWNER" || membership.role === "ADMIN";
  const t = await getTranslations("seller.api");
  const [rows, subscription] = await Promise.all([listApiKeys(company.id), currentSubscription(company.id)]);
  const planAllows = subscription?.plan.limits.apiAccess ?? false;

  return (
    <>
      <ApiKeysManager
        locale={locale}
        canManage={canManage}
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

      {!planAllows ? (
        <Alert variant="warning" title={t("planTitle")} className="mt-5">
          {t("planBody")}
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardHeader title={t("docsTitle")} description={t("docsHint")} />
        <CardContent className="space-y-3 text-sm text-steel-700">
          <p>{t("docsAuth")}</p>
          <pre className="overflow-x-auto rounded-md border border-steel-200 bg-steel-50 p-3 font-mono text-xs text-ink-900">{`curl -H "Authorization: Bearer cang_xxxx_…" \\\n  https://cang.vn/api/v1/products`}</pre>
          <p>{t("docsScopes")}</p>
        </CardContent>
      </Card>
    </>
  );
}
