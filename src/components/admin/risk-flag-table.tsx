import { getTranslations } from "next-intl/server";
import { severityVariant } from "@/components/admin/badges";
import { RiskFlagButtons } from "@/components/admin/moderation-actions";
import { Badge, EmptyState, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { timeAgo } from "@/lib/utils";
import type { listRiskFlags } from "@/modules/admin/risk/queries";

type Rows = Awaited<ReturnType<typeof listRiskFlags>>["rows"];

/** Shared risk-flag table (moderation page tab + risk page). Server component. */
export async function RiskFlagTable({ rows, locale, canWrite }: { rows: Rows; locale: string; canWrite: boolean }) {
  const t = await getTranslations("admin.risk");
  const tc = await getTranslations("admin.common");
  if (rows.length === 0) return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  return (
    <Table>
      <THead>
        <TR>
          <TH>{t("colRule")}</TH>
          <TH>{t("colEntity")}</TH>
          <TH>{t("colSeverity")}</TH>
          <TH>{tc("status")}</TH>
          <TH className="hidden md:table-cell">{t("colCreated")}</TH>
          <TH className="text-right">{tc("actions")}</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map(({ flag, company, resolvedBy }) => (
          <TR key={flag.id}>
            <TD className="max-w-[360px]">
              <span className="font-medium text-ink-900">{flag.ruleCode}</span>
              <p className="text-xs text-steel-600">{flag.description}</p>
              {flag.resolution ? (
                <p className="mt-0.5 text-xs text-steel-500">
                  {t("resolution")}: {flag.resolution}
                  {resolvedBy ? ` · ${resolvedBy.name}` : ""}
                </p>
              ) : null}
            </TD>
            <TD className="text-xs">
              <span className="text-steel-500">{flag.entityType}</span>{" "}
              {company ? (
                <Link href={`/admin/companies/${company.id}`} className="text-ink-900 hover:underline">
                  {company.name}
                </Link>
              ) : (
                <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px]">{flag.entityId}</code>
              )}
            </TD>
            <TD>
              <Badge size="sm" variant={severityVariant(flag.severity)}>
                {flag.severity}
              </Badge>
            </TD>
            <TD>
              <StatusBadge status={flag.status} size="sm" />
            </TD>
            <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{timeAgo(flag.createdAt, locale)}</TD>
            <TD className="text-right">
              <RiskFlagButtons flagId={flag.id} status={flag.status} canWrite={canWrite} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
