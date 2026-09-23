import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinancingAppActions, FinancingProviderToggle } from "@/components/admin/financing-actions";
import { Badge, Card, CardContent, CardHeader, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { FINANCING_TABS, financingTabCounts, listFinancingApplications, listFinancingProviders, type FinancingTab } from "@/modules/admin/financing/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Financing", robots: { index: false } };

export default async function AdminFinancingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.financing.read");
  const t = await getTranslations("admin.financing");
  const tc = await getTranslations("admin.common");
  const tab = (FINANCING_TABS.includes(str(sp.tab) as FinancingTab) ? str(sp.tab) : "open") as FinancingTab;
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts, providers] = await Promise.all([listFinancingApplications({ tab, page }), financingTabCounts(), listFinancingProviders()]);
  const canWrite = canPlatform(auth, "admin.financing.write");
  const providerOptions = providers.filter((x) => x.isActive).map((x) => ({ id: x.id, name: x.name }));

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-5" tabs={FINANCING_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/financing", { tab: value }), count: counts[value] }))} />
      {rows.length === 0 ? (
        <EmptyState icon={<Landmark />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colApplication")}</TH>
                <TH>{t("colCompany")}</TH>
                <TH className="text-right">{t("colAmount")}</TH>
                <TH className="hidden md:table-cell">{t("colProvider")}</TH>
                <TH className="hidden lg:table-cell">{t("colRisk")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden xl:table-cell">{t("colOffers")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <span className="font-medium text-ink-900">{a.applicationNumber}</span>
                    <span className="block text-xs text-steel-500">
                      {humanize(a.productType)} · {a.side === "SELLER" ? tc("seller") : tc("buyer")}
                      {a.order ? (
                        <>
                          {" · "}
                          <Link href={`/admin/orders/${a.order.id}`} className="hover:underline">
                            {a.order.orderNumber}
                          </Link>
                        </>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-steel-400">{formatDate(a.submittedAt ?? a.createdAt, locale)}</span>
                  </TD>
                  <TD>
                    <Link href={`/admin/companies/${a.company.id}`} className="hover:underline">
                      {a.company.name}
                    </Link>
                    <span className="block text-xs text-steel-500">{a.company.countryCode}</span>
                  </TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">
                    {formatMoney(a.amount, a.currency, locale)}
                    {a.requestedTenorDays ? <span className="block text-[11px] text-steel-500">{a.requestedTenorDays} d</span> : null}
                  </TD>
                  <TD className="hidden text-xs md:table-cell">{a.provider?.name ?? "—"}</TD>
                  <TD className="hidden lg:table-cell">
                    {a.riskScore != null ? (
                      <Badge size="sm" variant={a.riskGrade === "A" || a.riskGrade === "B" ? "success" : a.riskGrade === "C" ? "warning" : "danger"}>
                        {a.riskGrade} · {a.riskScore}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={a.status} size="sm" />
                    {a.declineReason ? <span className="block max-w-[200px] truncate text-[11px] text-steel-500">{a.declineReason}</span> : null}
                  </TD>
                  <TD className="hidden text-xs xl:table-cell">
                    {a.offers.length === 0
                      ? "—"
                      : a.offers.map((o) => (
                          <span key={o.id} className="block">
                            {formatMoney(o.amount, o.currency, locale)} · {o.tenorDays} d{o.interestRate != null ? ` · ${o.interestRate}%` : ""} · <StatusBadge status={o.status} size="sm" />
                          </span>
                        ))}
                  </TD>
                  <TD className="text-right">
                    <FinancingAppActions applicationId={a.id} status={a.status} amount={a.amount} currency={a.currency} tenorDays={a.requestedTenorDays} providers={providerOptions} defaultProviderId={a.providerId} canWrite={canWrite} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/financing", { tab, page: n })} className="mt-6" />
        </>
      )}

      <Card className="mt-8">
        <CardHeader title={t("providers")} description={t("providersHint")} />
        <CardContent className="p-0">
          <Table className="border-0">
            <THead>
              <TR>
                <TH>{t("colProvider")}</TH>
                <TH className="hidden md:table-cell">{t("colProducts")}</TH>
                <TH className="hidden lg:table-cell">{t("colAppetite")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {providers.map((x) => (
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
                    {x.minAmount != null || x.maxAmount != null ? `${x.minAmount != null ? formatMoney(x.minAmount, x.currencies[0] ?? "USD", locale, { compact: true }) : "…"} – ${x.maxAmount != null ? formatMoney(x.maxAmount, x.currencies[0] ?? "USD", locale, { compact: true }) : "…"}` : "—"}
                    {x.indicativeRate ? ` · ${x.indicativeRate}` : ""}
                    {x.countries.length ? ` · ${x.countries.join(", ")}` : ""}
                  </TD>
                  <TD>
                    <StatusBadge status={x.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                  </TD>
                  <TD className="text-right">{canWrite ? <FinancingProviderToggle providerId={x.id} isActive={x.isActive} /> : null}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
