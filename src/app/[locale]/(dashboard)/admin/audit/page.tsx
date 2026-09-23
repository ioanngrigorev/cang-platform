import { Download, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { JsonDiff } from "@/components/admin/json-details";
import { Badge, EmptyState, Input, PageHeader, Pagination, TBody, TD, TH, THead, TR, Table, buttonVariants } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/utils";
import { ACTOR_TYPES, auditActionPrefixes, listAuditLogs } from "@/modules/admin/audit/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

const ENTITY_LINKS: Record<string, string> = { user: "/admin/users", company: "/admin/companies", verification: "/admin/verification", product: "/admin/products", rfq: "/admin/rfqs", order: "/admin/orders", dispute: "/admin/disputes", support_ticket: "/admin/support" };

export default async function AdminAuditPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.audit.read");
  const t = await getTranslations("admin.audit");
  const tc = await getTranslations("admin.common");
  const filters = { action: str(sp.action), actorType: str(sp.actorType), entityType: str(sp.entityType), entityId: str(sp.entityId), actor: str(sp.actor), from: str(sp.from), to: str(sp.to), page: pageParam(sp.page) };
  const [{ rows, total, page, totalPages }, prefixes] = await Promise.all([listAuditLogs(filters), auditActionPrefixes()]);
  const csvHref = `/api/admin/audit?${new URLSearchParams(Object.entries(filters).filter(([k, v]) => k !== "page" && v) as [string, string][]).toString()}`;

  return (
    <div className="max-w-none">
      <PageHeader
        title={t("title")}
        description={t("description", { count: total })}
        actions={
          <a href={csvHref} className={buttonVariants({ variant: "secondary", size: "sm" })} download>
            <Download /> {t("exportCsv")}
          </a>
        }
      />
      <FilterBar
        selects={[
          { name: "action", value: filters.action, allLabel: t("allActions"), options: prefixes.map((p) => ({ value: p, label: p })) },
          { name: "actorType", value: filters.actorType, allLabel: t("allActorTypes"), options: ACTOR_TYPES.map((a) => ({ value: a, label: a })) },
        ]}
        submitLabel={tc("filter")}
        clearHref="/admin/audit"
        clearLabel={tc("clear")}
        className="mb-5"
      >
        <Input name="entityType" defaultValue={filters.entityType} placeholder={t("entityType")} className="w-40" aria-label={t("entityType")} />
        <Input name="entityId" defaultValue={filters.entityId} placeholder={t("entityId")} className="w-48" aria-label={t("entityId")} />
        <Input name="actor" defaultValue={filters.actor} placeholder={t("actor")} className="w-44" aria-label={t("actor")} />
        <Input name="from" type="date" defaultValue={filters.from} className="w-40" aria-label={t("from")} />
        <Input name="to" type="date" defaultValue={filters.to} className="w-40" aria-label={t("to")} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colWhen")}</TH>
                <TH>{t("colActor")}</TH>
                <TH>{t("colAction")}</TH>
                <TH>{t("colEntity")}</TH>
                <TH className="hidden lg:table-cell">{t("colIp")}</TH>
                <TH>{t("colChange")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ log, actor }) => {
                const base = ENTITY_LINKS[log.entityType];
                return (
                  <TR key={log.id}>
                    <TD className="whitespace-nowrap text-xs text-steel-600">{formatDateTime(log.createdAt, locale)}</TD>
                    <TD className="text-xs">
                      <Badge size="sm" variant={log.actorType === "ADMIN" ? "ink" : log.actorType === "SYSTEM" ? "neutral" : "outline"}>
                        {log.actorType}
                      </Badge>
                      {actor ? (
                        <Link href={`/admin/users/${actor.id}`} className="ml-1 text-ink-900 hover:underline">
                          {actor.name}
                        </Link>
                      ) : null}
                    </TD>
                    <TD>
                      <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px]">{log.action}</code>
                    </TD>
                    <TD className="text-xs">
                      <span className="text-steel-500">{log.entityType}</span>{" "}
                      {log.entityId ? (
                        base ? (
                          <Link href={`${base}/${log.entityId}`} className="font-mono text-[11px] text-ink-900 hover:underline">
                            {log.entityId}
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px]">{log.entityId}</span>
                        )
                      ) : null}
                    </TD>
                    <TD className="hidden text-xs text-steel-500 lg:table-cell">{log.ipAddress ?? "—"}</TD>
                    <TD className="min-w-[200px]">
                      {log.before || log.after ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-ink-700 hover:text-ink-900">{t("viewDiff")}</summary>
                          <div className="mt-2 w-[min(70vw,720px)]">
                            <JsonDiff before={log.before} after={log.after} beforeLabel={t("before")} afterLabel={t("after")} />
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-steel-400">—</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(n) => qs("/admin/audit", { ...filters, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
