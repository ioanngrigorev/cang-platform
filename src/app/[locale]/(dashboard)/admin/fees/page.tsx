import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CommissionStatusButtons, FeeRuleDialog, FeeRuleToggle } from "@/components/admin/fee-forms";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, Card, CardContent, CardHeader, LinkTabs, PageHeader, Pagination, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { listCommissions, listFeeRules, planOptions } from "@/modules/admin/fees/queries";
import { COMMISSION_STATUSES } from "@/modules/admin/fees/schemas";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Fees & commissions", robots: { index: false } };

export default async function AdminFeesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.fees.write");
  const t = await getTranslations("admin.fees");
  const tc = await getTranslations("admin.common");
  const tab = str(sp.tab) === "ledger" ? "ledger" : "rules";
  const status = str(sp.status);
  const page = pageParam(sp.page);
  const canWrite = canPlatform(auth, "admin.fees.write");
  const [rules, plans, ledger] = await Promise.all([listFeeRules(), planOptions(), listCommissions({ status, page })]);
  const sum = (statuses: string[]) => {
    const by = new Map<string, number>();
    for (const r of ledger.totals) if (statuses.includes(r.status)) by.set(r.currency, (by.get(r.currency) ?? 0) + r.total);
    return [...by.entries()].map(([c, v]) => formatMoney(v, c, locale, { compact: true })).join(" · ") || formatMoney(0, "USD", locale);
  };
  const dateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={tab === "rules" && canWrite ? <FeeRuleDialog plans={plans} /> : null} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("stats.pending")} value={sum(["PENDING", "INVOICED"])} />
        <StatCard label={t("stats.collected")} value={sum(["COLLECTED"])} />
        <StatCard label={t("stats.rules")} value={rules.filter((r) => r.isActive).length} hint={t("stats.rulesHint", { total: rules.length })} />
      </div>
      <LinkTabs current={tab} className="mb-5" tabs={[{ value: "rules", label: t("tabs.rules"), href: "/admin/fees?tab=rules", count: rules.length }, { value: "ledger", label: t("tabs.ledger"), href: "/admin/fees?tab=ledger", count: ledger.total }]} />

      {tab === "rules" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colRule")}</TH>
              <TH>{t("colType")}</TH>
              <TH>{t("colValue")}</TH>
              <TH className="hidden md:table-cell">{t("colScope")}</TH>
              <TH className="hidden lg:table-cell">{t("colPaidBy")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {rules.map((r) => (
              <TR key={r.id}>
                <TD>
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-steel-500">
                    {r.code}
                    {r.description ? ` · ${r.description}` : ""}
                  </span>
                </TD>
                <TD className="text-xs">{humanize(r.type)}</TD>
                <TD className="whitespace-nowrap tabular-nums">
                  {r.calc === "PERCENTAGE" ? `${r.value}%` : r.calc === "FIXED" ? formatMoney(r.value, r.currency, locale) : t("calcs.TIERED")}
                  {r.minFee != null || r.maxFee != null ? (
                    <span className="block text-[11px] text-steel-500">
                      {r.minFee != null ? `min ${formatMoney(r.minFee, r.currency, locale)}` : ""}
                      {r.maxFee != null ? ` max ${formatMoney(r.maxFee, r.currency, locale)}` : ""}
                    </span>
                  ) : null}
                </TD>
                <TD className="hidden text-xs md:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {r.plan ? <Badge size="sm" variant="ink">{r.plan.name}</Badge> : null}
                    {r.categorySlug ? <Badge size="sm">{r.categorySlug}</Badge> : null}
                    {r.countryCode ? <Badge size="sm">{r.countryCode}</Badge> : null}
                    {!r.plan && !r.categorySlug && !r.countryCode ? <span className="text-steel-500">{t("global")}</span> : null}
                    {r.priority ? <span className="text-steel-500">p{r.priority}</span> : null}
                  </span>
                </TD>
                <TD className="hidden text-xs lg:table-cell">{r.paidBy}</TD>
                <TD>
                  <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                  {r.validTo ? <span className="block text-[11px] text-steel-500">→ {formatDate(r.validTo, locale)}</span> : null}
                </TD>
                <TD className="text-right">
                  {canWrite ? (
                    <span className="inline-flex gap-1">
                      <FeeRuleDialog plans={plans} values={{ id: r.id, code: r.code, name: r.name, type: r.type, calc: r.calc, value: r.value, tiers: r.tiers, currency: r.currency, minFee: r.minFee, maxFee: r.maxFee, planId: r.planId, categorySlug: r.categorySlug, countryCode: r.countryCode, paidBy: r.paidBy, priority: r.priority, isActive: r.isActive, validFrom: dateStr(r.validFrom), validTo: dateStr(r.validTo), description: r.description }} />
                      <FeeRuleToggle feeRuleId={r.id} isActive={r.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <Card>
          <CardHeader title={t("tabs.ledger")} description={t("ledgerHint")} />
          <CardContent>
            <FilterBar keep={{ tab: "ledger" }} selects={[{ name: "status", value: status, allLabel: t("allStatuses"), options: COMMISSION_STATUSES.map((s) => ({ value: s, label: humanize(s) })) }]} submitLabel={tc("filter")} clearHref="/admin/fees?tab=ledger" clearLabel={tc("clear")} className="mb-4" />
            <Table>
              <THead>
                <TR>
                  <TH>{t("colCompany")}</TH>
                  <TH>{t("colOrder")}</TH>
                  <TH className="hidden md:table-cell">{t("colRule")}</TH>
                  <TH className="text-right">{t("colBase")}</TH>
                  <TH className="text-right">{t("colAmount")}</TH>
                  <TH>{tc("status")}</TH>
                  <TH className="hidden lg:table-cell">{t("colCreated")}</TH>
                  <TH className="text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {ledger.rows.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="py-8 text-center text-steel-500">
                      {tc("none")}
                    </TD>
                  </TR>
                ) : null}
                {ledger.rows.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/admin/companies/${c.company.id}`} className="font-medium hover:underline">
                        {c.company.name}
                      </Link>
                      <span className="block text-xs text-steel-500">{humanize(c.type)}</span>
                    </TD>
                    <TD>
                      {c.order ? (
                        <Link href={`/admin/orders/${c.order.id}`} className="hover:underline">
                          {c.order.orderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="hidden text-xs md:table-cell">{c.rule?.name ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums text-steel-600">{formatMoney(c.baseAmount, c.currency, locale)}</TD>
                    <TD className="whitespace-nowrap text-right font-medium tabular-nums">
                      {formatMoney(c.amount, c.currency, locale)}
                      {c.rate != null ? <span className="block text-[11px] font-normal text-steel-500">{Number(c.rate).toFixed(2)}%</span> : null}
                    </TD>
                    <TD>
                      <StatusBadge status={c.status} size="sm" />
                      {c.collectedAt ? <span className="block text-[11px] text-steel-500">{formatDate(c.collectedAt, locale)}</span> : null}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-xs text-steel-600 lg:table-cell">{formatDate(c.createdAt, locale)}</TD>
                    <TD className="text-right">{canWrite ? <CommissionStatusButtons commissionId={c.id} status={c.status} /> : null}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={ledger.page} totalPages={ledger.totalPages} hrefFor={(n) => qs("/admin/fees", { tab: "ledger", status, page: n })} className="mt-4" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
