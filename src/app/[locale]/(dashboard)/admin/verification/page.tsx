import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { codeLabel } from "@/components/admin/badges";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, timeAgo } from "@/lib/utils";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { VERIFICATION_TABS, VERIFICATION_TYPES, listVerifications, verificationTabCounts, type VerificationTab } from "@/modules/admin/verification/queries";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "KYB verification", robots: { index: false } };

export default async function AdminVerificationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.verification.review");
  const t = await getTranslations("admin.verification");
  const tc = await getTranslations("admin.common");
  const tab = (VERIFICATION_TABS.includes(str(sp.tab) as VerificationTab) ? str(sp.tab) : "pending") as VerificationTab;
  const type = str(sp.type);
  const q = str(sp.q);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts] = await Promise.all([listVerifications({ tab, type, q, page }), verificationTabCounts(type)]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={VERIFICATION_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/verification", { tab: value, type, q }), count: counts[value] }))} />
      <FilterBar
        q={q}
        qPlaceholder={t("searchPlaceholder")}
        keep={{ tab }}
        selects={[{ name: "type", value: type, allLabel: t("allTypes"), options: VERIFICATION_TYPES.map((v) => ({ value: v, label: codeLabel(v) })) }]}
        submitLabel={tc("search")}
        clearHref={qs("/admin/verification", { tab })}
        clearLabel={tc("clear")}
        className="mb-5"
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BadgeCheck />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colCompany")}</TH>
                <TH>{t("colType")}</TH>
                <TH className="hidden sm:table-cell">{t("colCountry")}</TH>
                <TH>{tc("status")}</TH>
                <TH>{t("colSubmitted")}</TH>
                <TH className="hidden md:table-cell">{t("colReviewed")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((v) => (
                <TR key={v.id}>
                  <TD>
                    <Link href={`/admin/verification/${v.id}`} className="font-medium text-ink-900 hover:underline">
                      {v.company.name}
                    </Link>
                    <p className="flex gap-1 text-xs text-steel-500">
                      {v.company.isSeller ? <Badge size="sm" variant="ink">{tc("seller")}</Badge> : null}
                      {v.company.isBuyer ? <Badge size="sm">{tc("buyer")}</Badge> : null}
                    </p>
                  </TD>
                  <TD>{codeLabel(v.type)}</TD>
                  <TD className="hidden sm:table-cell">{v.company.countryCode}</TD>
                  <TD>
                    <StatusBadge status={v.status} label={tc(`verification.${v.status}`)} size="sm" />
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-steel-600">
                    {formatDate(v.submittedAt, locale)}
                    <span className="block text-[11px] text-steel-400">{timeAgo(v.submittedAt, locale)}</span>
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{v.reviewedAt ? formatDate(v.reviewedAt, locale) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/verification", { tab, type, q, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
