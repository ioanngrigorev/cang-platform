import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { shipmentStatusLabels } from "@/modules/logistics/tracking/labels";
import { AssignPartnerDialog, LogisticsProviderDialog, LogisticsProviderToggle, ShipmentEventDialog } from "@/components/admin/logistics-forms";
import { Card, CardContent, CardHeader, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { listAdminLogisticsRequests, listAdminShipments, listLogisticsProvidersAll } from "@/modules/admin/logistics/queries";
import { maskSecrets, pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Logistics", robots: { index: false } };

const TABS = ["shipments", "requests", "providers"] as const;

export default async function AdminLogisticsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.logistics.write");
  const t = await getTranslations("admin.logistics");
  const statusLabels = await shipmentStatusLabels();
  const tc = await getTranslations("admin.common");
  const tt = await getTranslations("tracking");
  const tab = (TABS.includes(str(sp.tab) as (typeof TABS)[number]) ? str(sp.tab) : "shipments") as (typeof TABS)[number];
  const page = pageParam(sp.page);
  const canWrite = canPlatform(auth, "admin.logistics.write");
  const [shipments, requests, providers] = await Promise.all([tab === "shipments" ? listAdminShipments(page) : null, tab === "requests" ? listAdminLogisticsRequests(page) : null, listLogisticsProvidersAll()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={tab === "providers" && canWrite ? <LogisticsProviderDialog /> : null} />
      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/logistics", { tab: value }), count: value === "providers" ? providers.length : undefined }))} />

      {tab === "shipments" && shipments ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colShipment")}</TH>
                <TH>{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colRoute")}</TH>
                <TH className="hidden lg:table-cell">{t("colCarrier")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden xl:table-cell">{t("colEta")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {shipments.rows.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-steel-500">
                    {tc("none")}
                  </TD>
                </TR>
              ) : null}
              {shipments.rows.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <span className="font-medium">{s.shipmentNumber}</span>
                    <span className="block text-xs text-steel-500">
                      {humanize(s.mode)}
                      {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                    </span>
                  </TD>
                  <TD>
                    <Link href={`/admin/orders/${s.order.id}`} className="hover:underline">
                      {s.order.orderNumber}
                    </Link>
                    <span className="block text-xs text-steel-500">{s.supplier.name}</span>
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {s.originPort ?? "—"} → {s.destinationPort ?? "—"}
                  </TD>
                  <TD className="hidden text-xs lg:table-cell">
                    {s.provider?.name ?? "—"}
                    {s.carrier ? <span className="block text-steel-500">{s.carrier}</span> : null}
                  </TD>
                  <TD>
                    <StatusBadge status={s.status} label={statusLabels[s.status]} size="sm" />
                    {s.exceptionReason ? <span className="block text-xs text-warning-700">{tt(`reasons.${s.exceptionReason}`)}</span> : null}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 xl:table-cell">
                    {s.etd ? `ETD ${formatDate(s.etd, locale)}` : ""}
                    {s.eta ? ` · ETA ${formatDate(s.eta, locale)}` : ""}
                  </TD>
                  <TD className="text-right">
                    {canWrite ? (
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <AssignPartnerDialog shipmentId={s.id} providerId={s.provider?.id ?? null} providers={providers.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))} />
                        <ShipmentEventDialog shipmentId={s.id} />
                      </span>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={shipments.page} totalPages={shipments.totalPages} hrefFor={(n) => qs("/admin/logistics", { tab, page: n })} className="mt-6" />
        </>
      ) : null}

      {tab === "requests" && requests ? (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colRequest")}</TH>
                <TH>{t("colRequester")}</TH>
                <TH className="hidden md:table-cell">{t("colRoute")}</TH>
                <TH className="hidden lg:table-cell">{t("colCargo")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden xl:table-cell">{t("colQuotes")}</TH>
              </TR>
            </THead>
            <TBody>
              {requests.rows.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-steel-500">
                    {tc("none")}
                  </TD>
                </TR>
              ) : null}
              {requests.rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <span className="font-medium">{r.requestNumber}</span>
                    <span className="block text-xs text-steel-500">
                      {r.services.map(humanize).join(", ")}
                      {r.order ? (
                        <>
                          {" · "}
                          <Link href={`/admin/orders/${r.order.id}`} className="hover:underline">
                            {r.order.orderNumber}
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </TD>
                  <TD>
                    <Link href={`/admin/companies/${r.requesterCompany.id}`} className="hover:underline">
                      {r.requesterCompany.name}
                    </Link>
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {r.originCountryCode} → {r.destinationCountryCode}
                    {r.preferredMode ? ` · ${humanize(r.preferredMode)}` : ""}
                    {r.incoterm ? ` · ${r.incoterm}` : ""}
                  </TD>
                  <TD className="hidden text-xs lg:table-cell">
                    {r.cargoDescription ?? "—"}
                    {r.grossWeightKg ? ` · ${r.grossWeightKg} kg` : ""}
                    {r.volumeCbm ? ` · ${r.volumeCbm} cbm` : ""}
                    {r.cargoValue ? ` · ${formatMoney(r.cargoValue, r.currency, locale)}` : ""}
                  </TD>
                  <TD>
                    <StatusBadge status={r.status} size="sm" />
                  </TD>
                  <TD className="hidden text-xs xl:table-cell">
                    {r.quotes.length === 0
                      ? "—"
                      : r.quotes.map((q) => (
                          <span key={q.id} className="block">
                            {q.provider.name}: {formatMoney(q.amount, q.currency, locale)} · {q.transitDays ?? "?"} d · <StatusBadge status={q.status} size="sm" />
                          </span>
                        ))}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={requests.page} totalPages={requests.totalPages} hrefFor={(n) => qs("/admin/logistics", { tab, page: n })} className="mt-6" />
        </>
      ) : null}

      {tab === "providers" ? (
        <Card>
          <CardHeader title={t("tabs.providers")} description={t("providersHint")} />
          <CardContent className="p-0">
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>{t("colProvider")}</TH>
                  <TH className="hidden md:table-cell">{t("services")}</TH>
                  <TH className="hidden lg:table-cell">{t("modes")}</TH>
                  <TH className="hidden lg:table-cell">{t("countries")}</TH>
                  <TH>{tc("status")}</TH>
                  <TH className="text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {providers.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <span className="font-medium">{p.name}</span>
                      <span className="block text-xs text-steel-500">
                        {p.code} · {p.adapterCode}
                      </span>
                      {p.company ? (
                        <Link href={`/admin/companies/${p.company.id}`} className="block text-xs text-ink-700 hover:underline">
                          {t("partnerPortalOf", { name: p.company.name })}
                        </Link>
                      ) : null}
                    </TD>
                    <TD className="hidden text-xs md:table-cell">{p.services.map(humanize).join(", ") || "—"}</TD>
                    <TD className="hidden text-xs lg:table-cell">{p.modes.map(humanize).join(", ") || "—"}</TD>
                    <TD className="hidden text-xs lg:table-cell">{p.countries.join(", ") || "—"}</TD>
                    <TD>
                      {!p.isActive && p.company ? <StatusBadge status="PENDING" label={t("pendingApproval")} size="sm" /> : <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />}
                    </TD>
                    <TD className="text-right">
                      {canWrite ? (
                        <span className="inline-flex gap-1">
                          <LogisticsProviderDialog values={{ id: p.id, code: p.code, name: p.name, description: p.description, services: p.services, modes: p.modes, countries: p.countries, adapterCode: p.adapterCode, apiConfig: maskSecrets(p.apiConfig), sortOrder: p.sortOrder, isActive: p.isActive, companySlug: p.company?.slug ?? null }} />
                          <LogisticsProviderToggle providerId={p.id} isActive={p.isActive} approve={!p.isActive && !!p.company} />
                        </span>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
