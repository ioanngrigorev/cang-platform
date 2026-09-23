import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonDetails } from "@/components/admin/json-details";
import { LogisticsProviderDialog } from "@/components/admin/logistics-forms";
import { FinancingProviderDialog, InspectionProviderDialog, PaymentProviderDialog, ProviderToggle } from "@/components/admin/provider-forms";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, LinkTabs, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatMoney, humanize } from "@/lib/utils";
import { allProviders, emailProviderSummary } from "@/modules/admin/providers/queries";
import { str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Providers", robots: { index: false } };

const TABS = ["payment", "logistics", "financing", "inspection", "email"] as const;
type Tab = (typeof TABS)[number];

export default async function AdminProvidersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.access");
  const t = await getTranslations("admin.providers");
  const tc = await getTranslations("admin.common");
  const tab = (TABS.includes(str(sp.tab) as Tab) ? str(sp.tab) : "payment") as Tab;
  const p = await allProviders();
  const email = emailProviderSummary();
  const can = { payment: canPlatform(auth, "admin.payments.write"), logistics: canPlatform(auth, "admin.logistics.write"), financing: canPlatform(auth, "admin.financing.write"), inspection: canPlatform(auth, "admin.logistics.write") };
  const counts: Record<Tab, number | undefined> = { payment: p.payment.length, logistics: p.logistics.length, financing: p.financing.length, inspection: p.inspection.length, email: undefined };

  const action =
    tab === "payment" && can.payment ? <PaymentProviderDialog /> : tab === "logistics" && can.logistics ? <LogisticsProviderDialog /> : tab === "financing" && can.financing ? <FinancingProviderDialog /> : tab === "inspection" && can.inspection ? <InspectionProviderDialog /> : null;

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={action} />
      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/admin/providers?tab=${value}`, count: counts[value] }))} />
      <Alert variant="info" className="mb-5">
        {t("secretsHint")}
      </Alert>

      {tab === "payment" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colProvider")}</TH>
              <TH>{t("type")}</TH>
              <TH className="hidden md:table-cell">{t("methods")}</TH>
              <TH className="hidden lg:table-cell">{t("fees")}</TH>
              <TH className="hidden xl:table-cell">{t("config")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {p.payment.map((x) => (
              <TR key={x.id}>
                <TD>
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-steel-500">
                    {x.code} · {x.adapterCode}
                    {x.licenseInfo ? ` · ${x.licenseInfo}` : ""}
                  </span>
                  <span className="flex gap-1 pt-1">
                    {x.isDefault ? <Badge size="sm" variant="ink">{t("isDefault")}</Badge> : null}
                    {x.supportsEscrow ? <Badge size="sm" variant="success">{t("escrow")}</Badge> : null}
                  </span>
                </TD>
                <TD className="text-xs">{humanize(x.type)}</TD>
                <TD className="hidden text-xs md:table-cell">
                  {x.supportedMethods.map(humanize).join(", ") || "—"}
                  <span className="block text-steel-500">{[x.supportedCurrencies.join("/"), x.supportedCountries.join("/")].filter(Boolean).join(" · ")}</span>
                </TD>
                <TD className="hidden text-xs lg:table-cell">{x.feeConfig ? `${x.feeConfig.percent ?? 0}% + ${formatMoney(x.feeConfig.fixed ?? 0, x.feeConfig.currency ?? "USD", locale)}` : "—"}</TD>
                <TD className="hidden xl:table-cell">
                  <JsonDetails summary={t("config")} value={x.publicConfig} />
                </TD>
                <TD>
                  <StatusBadge status={x.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {can.payment ? (
                    <span className="inline-flex gap-1">
                      <PaymentProviderDialog values={{ id: x.id, code: x.code, name: x.name, type: x.type, description: x.description, adapterCode: x.adapterCode, supportedMethods: x.supportedMethods, supportedCurrencies: x.supportedCurrencies, supportedCountries: x.supportedCountries, supportsEscrow: x.supportsEscrow, licenseInfo: x.licenseInfo, publicConfig: x.publicConfig, feeConfig: x.feeConfig, isActive: x.isActive, isDefault: x.isDefault, sortOrder: x.sortOrder }} />
                      <ProviderToggle providerId={x.id} kind="payment" isActive={x.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "logistics" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colProvider")}</TH>
              <TH className="hidden md:table-cell">{t("services")}</TH>
              <TH className="hidden lg:table-cell">{t("countries")}</TH>
              <TH className="hidden xl:table-cell">{t("config")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {p.logistics.map((x) => (
              <TR key={x.id}>
                <TD>
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-steel-500">
                    {x.code} · {x.adapterCode}
                  </span>
                </TD>
                <TD className="hidden text-xs md:table-cell">
                  {x.services.map(humanize).join(", ") || "—"}
                  <span className="block text-steel-500">{x.modes.map(humanize).join(", ")}</span>
                </TD>
                <TD className="hidden text-xs lg:table-cell">{x.countries.join(", ") || "—"}</TD>
                <TD className="hidden xl:table-cell">
                  <JsonDetails summary={t("config")} value={x.apiConfig} />
                </TD>
                <TD>
                  <StatusBadge status={x.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {can.logistics ? (
                    <span className="inline-flex gap-1">
                      <LogisticsProviderDialog values={{ id: x.id, code: x.code, name: x.name, description: x.description, services: x.services, modes: x.modes, countries: x.countries, adapterCode: x.adapterCode, apiConfig: x.apiConfig, sortOrder: x.sortOrder, isActive: x.isActive }} />
                      <ProviderToggle providerId={x.id} kind="logistics" isActive={x.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "financing" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colProvider")}</TH>
              <TH className="hidden md:table-cell">{t("products")}</TH>
              <TH className="hidden lg:table-cell">{t("appetite")}</TH>
              <TH className="hidden xl:table-cell">{t("config")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {p.financing.map((x) => (
              <TR key={x.id}>
                <TD>
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-steel-500">
                    {humanize(x.type)} · {x.code}
                    {x.regulator ? ` · ${x.regulator}` : ""}
                  </span>
                </TD>
                <TD className="hidden text-xs md:table-cell">{x.products.map(humanize).join(", ") || "—"}</TD>
                <TD className="hidden text-xs lg:table-cell">
                  {x.minAmount != null || x.maxAmount != null ? `${x.minAmount ?? "…"} – ${x.maxAmount ?? "…"} ${x.currencies[0] ?? ""}` : "—"}
                  <span className="block text-steel-500">
                    {x.minTenorDays ?? "…"}–{x.maxTenorDays ?? "…"} d{x.indicativeRate ? ` · ${x.indicativeRate}` : ""}
                  </span>
                </TD>
                <TD className="hidden xl:table-cell">
                  <JsonDetails summary={t("config")} value={{ routingRules: x.routingRules, apiConfig: x.apiConfig }} />
                </TD>
                <TD>
                  <StatusBadge status={x.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {can.financing ? (
                    <span className="inline-flex gap-1">
                      <FinancingProviderDialog values={{ id: x.id, code: x.code, name: x.name, type: x.type, description: x.description, licenseNumber: x.licenseNumber, regulator: x.regulator, products: x.products, countries: x.countries, currencies: x.currencies, minAmount: x.minAmount, maxAmount: x.maxAmount, minTenorDays: x.minTenorDays, maxTenorDays: x.maxTenorDays, indicativeRate: x.indicativeRate, adapterCode: x.adapterCode, apiConfig: x.apiConfig, routingRules: x.routingRules, isActive: x.isActive, sortOrder: x.sortOrder }} />
                      <ProviderToggle providerId={x.id} kind="financing" isActive={x.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "inspection" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colProvider")}</TH>
              <TH className="hidden md:table-cell">{t("services")}</TH>
              <TH className="hidden lg:table-cell">{t("countries")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {p.inspection.map((x) => (
              <TR key={x.id}>
                <TD>
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-steel-500">
                    {x.code} · {x.adapterCode}
                  </span>
                </TD>
                <TD className="hidden text-xs md:table-cell">{x.services.map(humanize).join(", ") || "—"}</TD>
                <TD className="hidden text-xs lg:table-cell">{x.countries.join(", ") || "—"}</TD>
                <TD>
                  <StatusBadge status={x.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {can.inspection ? (
                    <span className="inline-flex gap-1">
                      <InspectionProviderDialog values={{ id: x.id, code: x.code, name: x.name, description: x.description, services: x.services, countries: x.countries, adapterCode: x.adapterCode, apiConfig: x.apiConfig, isActive: x.isActive, sortOrder: x.sortOrder }} />
                      <ProviderToggle providerId={x.id} kind="inspection" isActive={x.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "email" ? (
        <Card>
          <CardHeader title={t("tabs.email")} description={t("emailHint")} />
          <CardContent>
            <DataList
              columns={2}
              items={[
                { label: t("emailProvider"), value: <Badge variant="ink">{email.provider}</Badge> },
                { label: t("emailFrom"), value: email.from },
                { label: t("smtpHost"), value: email.smtpHost ?? "—" },
                { label: t("credentials"), value: email.credentialsConfigured ? tc("yes") : tc("no") },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
