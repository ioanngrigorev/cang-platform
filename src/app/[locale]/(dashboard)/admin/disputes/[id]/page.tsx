import { FileText, Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DisputeAdminActions, DisputeAdminReply } from "@/components/admin/dispute-actions";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatDateTime, formatMoney, humanize } from "@/lib/utils";
import { getAdminDispute } from "@/modules/admin/disputes/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";
import { isStaff } from "@/modules/auth/rbac";

export const metadata: Metadata = { title: "Dispute", robots: { index: false } };

const CLOSED = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"];

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.disputes.resolve");
  const t = await getTranslations("admin.disputes");
  const tc = await getTranslations("admin.common");
  const d = await getAdminDispute(id);
  if (!d) notFound();
  const canResolve = canPlatform(auth, "admin.disputes.resolve");
  const closed = CLOSED.includes(d.status);
  const sideOf = (userId: string, role: string) => {
    if (isStaff(role as never)) return "staff";
    const c = d.companyByUser[userId];
    return c === d.raisedByCompanyId ? "raiser" : c === d.respondentCompanyId ? "respondent" : "staff";
  };

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/disputes" }, { label: d.disputeNumber }]}
        eyebrow={`${d.disputeNumber} · ${humanize(d.type)}`}
        title={d.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            <Link href={`/admin/orders/${d.order.id}`} className="hover:underline">
              {d.order.orderNumber}
            </Link>
            <span>· {formatMoney(d.order.total, d.order.currency, locale)}</span>
            {d.claimedAmount != null ? <span>· {t("claimed", { amount: formatMoney(d.claimedAmount, d.currency, locale) })}</span> : null}
            {d.respondBy && !closed ? <span>· {t("respondBy", { date: formatDate(d.respondBy, locale) })}</span> : null}
          </span>
        }
        actions={
          <DisputeAdminActions
            disputeId={d.id}
            status={d.status}
            currency={d.currency}
            claimedAmount={d.claimedAmount}
            orderStatus={d.order.statusCode}
            payments={d.heldPayments.map((p) => ({ id: p.id, label: `${p.paymentNumber} · ${formatMoney(p.amount, p.currency, locale)} · ${humanize(p.escrowStatus)}`, amount: p.amount }))}
            canResolve={canResolve}
          />
        }
      />

      {d.resolution ? (
        <Alert variant={d.status === "REJECTED" ? "warning" : "success"} title={t("resolution")} className="mb-6">
          <p>{d.resolution}</p>
          <p className="mt-1 text-xs">
            {d.resolvedBy?.name ?? "—"} · {d.resolvedAt ? formatDateTime(d.resolvedAt, locale) : ""}
            {d.resolutionAmount != null ? ` · ${t("refunded", { amount: formatMoney(d.resolutionAmount, d.currency, locale) })}` : ""}
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("thread")} description={t("threadHint")} />
            <CardContent className="space-y-4">
              <p className="rounded-md bg-steel-50 p-3 text-sm text-steel-700">{d.description}</p>
              <ol className="space-y-3">
                {d.messages.map((m) => {
                  const side = sideOf(m.authorId, m.author.platformRole);
                  return (
                    <li key={m.id} className={cn("rounded-md border p-3 text-sm", m.isInternal ? "border-warning-100 bg-warning-50" : side === "staff" ? "border-brand-100 bg-brand-50/40" : "border-hairline bg-surface")}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-steel-500">
                        <span className="font-medium text-ink-900">{m.author.name}</span>
                        <Badge size="sm" variant={side === "staff" ? "ink" : side === "raiser" ? "info" : "neutral"}>
                          {side === "staff" ? t("sideStaff") : side === "raiser" ? d.raisedByCompany.name : d.respondentCompany.name}
                        </Badge>
                        {m.isInternal ? (
                          <span className="inline-flex items-center gap-1 text-warning-700">
                            <Lock className="size-3" /> {t("internal")}
                          </span>
                        ) : null}
                        <span className="ml-auto">{formatDateTime(m.createdAt, locale)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ink-900">{m.body}</p>
                    </li>
                  );
                })}
              </ol>
              {canResolve ? <DisputeAdminReply disputeId={d.id} disabled={closed} /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("parties")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("raisedBy"), value: <Link href={`/admin/companies/${d.raisedByCompany.id}`} className="font-medium hover:underline">{d.raisedByCompany.name}</Link> },
                  { label: t("respondent"), value: <Link href={`/admin/companies/${d.respondentCompany.id}`} className="font-medium hover:underline">{d.respondentCompany.name}</Link> },
                  { label: t("orderStatus"), value: <StatusBadge status={d.order.statusCode} size="sm" /> },
                  { label: t("tradeAssurance"), value: d.order.tradeAssuranceEnabled ? tc("yes") : tc("no") },
                  { label: t("opened"), value: formatDateTime(d.createdAt, locale) },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("payments")} description={t("paymentsHint")} />
            <CardContent className="p-0">
              {d.heldPayments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {d.heldPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <span>
                        {p.paymentNumber}
                        <span className="block text-xs text-steel-500">{formatMoney(p.amount, p.currency, locale)}</span>
                      </span>
                      <span className="flex gap-1">
                        <StatusBadge status={p.status} size="sm" />
                        <StatusBadge status={p.escrowStatus} size="sm" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("evidence")} />
            <CardContent className="p-0">
              {d.documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {d.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 px-5 py-2.5 text-sm">
                      <FileText className="size-4 shrink-0 text-steel-400" />
                      <div className="min-w-0">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-ink-900 hover:underline">
                          {doc.name}
                        </a>
                        <p className="text-xs text-steel-500">
                          {doc.ownerCompanyId === d.raisedByCompanyId ? d.raisedByCompany.name : doc.ownerCompanyId === d.respondentCompanyId ? d.respondentCompany.name : "—"} · {formatDate(doc.createdAt, locale)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
