import { AlertTriangle, CheckCircle2, Clock, MapPinned, PackageOpen, Route, Timer } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { STATUS_BADGE } from "@/components/logistics/shipment-timeline";
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, timeAgo } from "@/lib/utils";
import { statusTone } from "@/modules/logistics/tracking/statuses";
import { requirePartner } from "@/modules/partner/context";
import { STALE_HOURS, listPartnerShipments, partnerOverview } from "@/modules/partner/queries";

export const metadata: Metadata = { title: "Partner portal", robots: { index: false } };

export default async function PartnerOverviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  const { company, provider } = await requirePartner();
  const t = await getTranslations("partner");
  const tt = await getTranslations("tracking");
  const [stats, problems, pickups] = await Promise.all([
    partnerOverview(provider.id),
    listPartnerShipments(provider.id, { tab: "problems", pageSize: 6 }),
    listPartnerShipments(provider.id, { tab: "pickup", pageSize: 6 }),
  ]);
  const profileIncomplete = provider.services.length === 0 || provider.modes.length === 0;

  return (
    <>
      <PageHeader title={t("overview.title")} description={t("overview.description", { company: company.name })} actions={<Button href="/partner/shipments">{t("overview.openShipments")}</Button>} />

      {welcome ? (
        <Alert variant="success" title={t("overview.welcomeTitle")} className="mb-5">
          {t("overview.welcomeBody")}
        </Alert>
      ) : null}
      {!provider.isActive ? (
        <Alert variant="warning" title={t("overview.pendingTitle")} className="mb-5">
          {t("overview.pendingBody")}{" "}
          <Link href="/partner/profile" className="font-medium underline">
            {t("overview.completeProfile")}
          </Link>
        </Alert>
      ) : profileIncomplete ? (
        <Alert variant="info" title={t("overview.profileTitle")} className="mb-5">
          {t("overview.profileBody")}{" "}
          <Link href="/partner/profile" className="font-medium underline">
            {t("overview.completeProfile")}
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/partner/shipments?tab=pickup"><StatCard label={t("stats.pickup")} value={stats.pickup} icon={<PackageOpen />} /></Link>
        <Link href="/partner/shipments?tab=transit"><StatCard label={t("stats.transit")} value={stats.transit} icon={<Route />} /></Link>
        <Link href="/partner/shipments?tab=delivery"><StatCard label={t("stats.delivery")} value={stats.delivery} icon={<MapPinned />} /></Link>
        <Link href="/partner/shipments?tab=problems"><StatCard label={t("stats.problems")} value={stats.problems} icon={<AlertTriangle />} /></Link>
        <StatCard label={t("stats.overdue")} value={stats.overdue} hint={t("stats.overdueHint")} icon={<Timer />} />
        <StatCard label={t("stats.stale")} value={stats.stale} hint={t("stats.staleHint", { hours: STALE_HOURS })} icon={<Clock />} />
        <StatCard label={t("stats.delivered30")} value={stats.delivered30} icon={<CheckCircle2 />} />
        <StatCard label={t("stats.active")} value={stats.active} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("overview.problemsTitle")} description={t("overview.problemsHint")} />
          <CardContent className="p-0">
            {problems.rows.length === 0 ? (
              <EmptyState className="border-0" icon={<CheckCircle2 />} title={t("overview.noProblems")} />
            ) : (
              <ul className="divide-y divide-steel-100">
                {problems.rows.map((s) => (
                  <li key={s.id}>
                    <Link href={`/partner/shipments/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-steel-50">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-ink-900">{s.shipmentNumber}</p>
                        <p className="truncate text-xs text-steel-500">
                          {s.supplierName} → {s.buyerName}
                          {s.exceptionReason ? ` · ${tt(`reasons.${s.exceptionReason}`)}` : ""}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE[statusTone(s.status)]} size="sm">{tt(`status.${s.status}`)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("overview.pickupsTitle")} description={t("overview.pickupsHint")} />
          <CardContent className="p-0">
            {pickups.rows.length === 0 ? (
              <EmptyState className="border-0" icon={<PackageOpen />} title={t("overview.noPickups")} />
            ) : (
              <ul className="divide-y divide-steel-100">
                {pickups.rows.map((s) => (
                  <li key={s.id}>
                    <Link href={`/partner/shipments/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-steel-50">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-ink-900">{s.shipmentNumber}</p>
                        <p className="truncate text-xs text-steel-500">
                          {s.supplierName}
                          {s.supplierCity ? `, ${s.supplierCity}` : ""} · {s.etd ? t("list.etd", { date: formatDate(s.etd, locale) }) : t("list.assigned", { ago: timeAgo(s.assignedAt ?? s.createdAt, locale) })}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE[statusTone(s.status)]} size="sm">{tt(`status.${s.status}`)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
