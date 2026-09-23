import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { RiskFlagTable } from "@/components/admin/risk-flag-table";
import { Badge, Card, CardContent, CardHeader, PageHeader, Pagination, RatingStars, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, humanize } from "@/lib/utils";
import { suspiciousReviews } from "@/modules/admin/moderation/queries";
import { RISK_SEVERITIES, RISK_STATUSES, flaggedComplianceChecks, listRiskFlags, riskFlagCounts, sanctionedCompanies } from "@/modules/admin/risk/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Risk & fraud", robots: { index: false } };

export default async function AdminRiskPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.compliance.review");
  const t = await getTranslations("admin.risk");
  const tc = await getTranslations("admin.common");
  const status = str(sp.status);
  const severity = str(sp.severity);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts, checks, sanctioned, reviews] = await Promise.all([listRiskFlags({ status, severity, page }), riskFlagCounts(), flaggedComplianceChecks(), sanctionedCompanies(), suspiciousReviews(8)]);
  const canWrite = canPlatform(auth, "admin.compliance.review");

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("open")} value={counts.OPEN} />
        <StatCard label={t("investigating")} value={counts.INVESTIGATING} />
        <StatCard label={t("sanctionsHits")} value={sanctioned.length} />
        <StatCard label={t("flaggedChecks")} value={checks.length} />
      </div>

      <Card className="mt-6">
        <CardHeader title={t("flags")} description={t("flagsHint")} />
        <CardContent>
          <FilterBar
            selects={[
              { name: "status", value: status, allLabel: t("allStatuses"), options: RISK_STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
              { name: "severity", value: severity, allLabel: t("allSeverities"), options: RISK_SEVERITIES.map((s) => ({ value: s, label: humanize(s) })) },
            ]}
            submitLabel={tc("filter")}
            clearHref="/admin/risk"
            clearLabel={tc("clear")}
            className="mb-4"
          />
          <RiskFlagTable rows={rows} locale={locale} canWrite={canWrite} />
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/risk", { status, severity, page: n })} className="mt-4" />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title={t("sanctions")} description={t("sanctionsHint")} />
          <CardContent className="p-0">
            {sanctioned.length === 0 && checks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-steel-500">{t("noSanctions")}</p>
            ) : (
              <Table className="border-0">
                <THead>
                  <TR>
                    <TH>{t("colCompany")}</TH>
                    <TH>{t("colCheck")}</TH>
                    <TH>{tc("status")}</TH>
                    <TH className="hidden md:table-cell">{t("colCreated")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {sanctioned.map((c) => (
                    <TR key={`s-${c.id}`}>
                      <TD>
                        <Link href={`/admin/companies/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                        <span className="block text-xs text-steel-500">{c.countryCode}</span>
                      </TD>
                      <TD className="text-xs">{t("companySanctions")}</TD>
                      <TD>
                        <Badge size="sm" variant={c.sanctionsStatus === "MATCH" ? "danger" : "warning"}>
                          {humanize(c.sanctionsStatus)}
                        </Badge>
                      </TD>
                      <TD className="hidden md:table-cell">—</TD>
                    </TR>
                  ))}
                  {checks.map(({ check, company }) => (
                    <TR key={check.id}>
                      <TD>
                        {company ? (
                          <Link href={`/admin/companies/${company.id}`} className="font-medium hover:underline">
                            {company.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {check.notes ? <span className="block max-w-[260px] truncate text-xs text-steel-500">{check.notes}</span> : null}
                      </TD>
                      <TD className="text-xs">
                        {check.type.replace(/_/g, " ")}
                        {check.riskScore != null ? ` · ${check.riskScore}` : ""}
                      </TD>
                      <TD>
                        <StatusBadge status={check.status} size="sm" />
                      </TD>
                      <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{formatDate(check.createdAt, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("suspiciousReviews")} description={t("suspiciousReviewsHint")} action={<Link href="/admin/moderation" className="text-xs font-medium text-brand-700 hover:underline">{t("openModeration")}</Link>} />
          <CardContent className="p-0">
            <ul className="divide-y divide-steel-100">
              {reviews.length === 0 ? <li className="px-5 py-6 text-sm text-steel-500">{tc("none")}</li> : null}
              {reviews.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <RatingStars value={r.ratingOverall} size={12} />
                    <p className="truncate text-ink-900">{r.title ?? "—"}</p>
                    <p className="truncate text-xs text-steel-500">
                      {r.authorCompany.name} → {r.targetCompany.name}
                    </p>
                  </div>
                  <Badge size="sm" variant={r.fraudScore >= 60 ? "danger" : r.fraudScore >= 30 ? "warning" : "neutral"}>
                    {r.fraudScore}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
