import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { COMPANY_TABS, companyTabCounts, listCompanies, type CompanyTab } from "@/modules/admin/companies/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Companies", robots: { index: false } };

export default async function AdminCompaniesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.companies.read");
  const t = await getTranslations("admin.companies");
  const tc = await getTranslations("admin.common");
  const tab = (COMPANY_TABS.includes(str(sp.tab) as CompanyTab) ? str(sp.tab) : "all") as CompanyTab;
  const q = str(sp.q);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts] = await Promise.all([listCompanies({ tab, q, page }), companyTabCounts()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={COMPANY_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/companies", { tab: value, q }), count: counts[value] }))} />
      <FilterBar q={q} qPlaceholder={t("searchPlaceholder")} keep={{ tab }} submitLabel={tc("search")} clearHref={qs("/admin/companies", { tab })} clearLabel={tc("clear")} className="mb-5" />
      {rows.length === 0 ? (
        <EmptyState icon={<Building2 />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colCompany")}</TH>
                <TH>{t("colType")}</TH>
                <TH className="hidden sm:table-cell">{t("colCountry")}</TH>
                <TH>{t("colVerification")}</TH>
                <TH className="hidden md:table-cell">{t("colPlan")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden lg:table-cell text-right">{t("colProducts")}</TH>
                <TH className="hidden lg:table-cell text-right">{t("colOrders")}</TH>
                <TH className="hidden xl:table-cell">{t("colCreated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/companies/${c.id}`} className="font-medium text-ink-900 hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-steel-500">{c.slug}</p>
                  </TD>
                  <TD className="text-xs">
                    <span className="flex flex-wrap gap-1">
                      {c.isSeller ? <Badge size="sm" variant="ink">{tc("seller")}</Badge> : null}
                      {c.isBuyer ? <Badge size="sm">{tc("buyer")}</Badge> : null}
                    </span>
                  </TD>
                  <TD className="hidden sm:table-cell">{c.countryCode}</TD>
                  <TD>
                    <StatusBadge status={c.verificationStatus} label={tc(`verification.${c.verificationStatus}`)} size="sm" />
                  </TD>
                  <TD className="hidden md:table-cell text-xs">{c.plan ?? "—"}</TD>
                  <TD>
                    <StatusBadge status={c.status} size="sm" />
                  </TD>
                  <TD className="hidden lg:table-cell text-right tabular-nums">{c.products}</TD>
                  <TD className="hidden lg:table-cell text-right tabular-nums">{c.orders}</TD>
                  <TD className="hidden xl:table-cell whitespace-nowrap text-xs text-steel-600">{formatDate(c.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/companies", { tab, q, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
