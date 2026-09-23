import { BadgeCheck, Boxes, Building2, CreditCard, FileText, Gavel, LifeBuoy, Megaphone, Package, ShieldAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, StatCard, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, timeAgo } from "@/lib/utils";
import { adminOverviewStats, recentAuditLogs, recentSignups } from "@/modules/admin/overview/queries";
import { requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Admin console", robots: { index: false } };

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const auth = await requireAdmin("admin.access");
  const t = await getTranslations("admin.overview");
  const [stats, logs, signups] = await Promise.all([adminOverviewStats(), recentAuditLogs(10), recentSignups(8)]);

  const queues = [
    { key: "kyb", count: stats.pendingKyb, href: "/admin/verification?tab=pending", icon: <BadgeCheck /> },
    { key: "products", count: stats.pendingProducts, href: "/admin/products?tab=pending", icon: <Boxes /> },
    { key: "payments", count: stats.pendingPayments, href: "/admin/payments?tab=pending", icon: <CreditCard /> },
    { key: "disputes", count: stats.openDisputes, href: "/admin/disputes?tab=open", icon: <ShieldAlert /> },
    { key: "ads", count: stats.pendingAds, href: "/admin/advertising?tab=pending", icon: <Megaphone /> },
    { key: "reviews", count: stats.pendingReviews, href: "/admin/moderation?tab=reviews", icon: <Gavel /> },
    { key: "support", count: stats.openTickets, href: "/admin/support?tab=open", icon: <LifeBuoy /> },
  ];

  return (
    <div className="max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-steel-600">{t("greeting", { name: auth.user.name })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.users")} value={stats.users} icon={<Users />} />
        <StatCard label={t("stats.companies")} value={stats.companies} hint={t("stats.companiesHint", { sellers: stats.sellers, buyers: stats.buyers })} icon={<Building2 />} />
        <StatCard label={t("stats.pendingKyb")} value={stats.pendingKyb} icon={<BadgeCheck />} />
        <StatCard label={t("stats.pendingProducts")} value={stats.pendingProducts} icon={<Boxes />} />
        <StatCard label={t("stats.openRfqs")} value={stats.openRfqs} icon={<FileText />} />
        <StatCard label={t("stats.activeOrders")} value={stats.activeOrders} icon={<Package />} />
        <StatCard
          label={t("stats.gmv30d")}
          value={stats.gmv30d.length ? stats.gmv30d.map((g) => formatMoney(g.total, g.currency, locale, { compact: true })).join(" · ") : formatMoney(0, "USD", locale)}
          hint={t("stats.gmvHint")}
        />
        <StatCard label={t("stats.openDisputes")} value={stats.openDisputes} icon={<ShieldAlert />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-1">
          <CardHeader title={t("needsAttention")} description={t("needsAttentionHint")} />
          <CardContent className="p-0">
            <ul className="divide-y divide-steel-100">
              {queues.map((q) => (
                <li key={q.key}>
                  <Link href={q.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-steel-50">
                    <span className="rounded-md bg-ink-50 p-1.5 text-ink-700 [&_svg]:size-4">{q.icon}</span>
                    <span className="flex-1 text-ink-900">{t(`queues.${q.key}`)}</span>
                    <span className={q.count > 0 ? "rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700" : "rounded-full bg-steel-100 px-2 py-0.5 text-xs font-medium text-steel-600"}>{q.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title={t("recentAudit")} action={<Link href="/admin/audit" className="text-xs font-medium text-brand-700 hover:underline">{t("viewAll")}</Link>} />
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-steel-500">{t("noAudit")}</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {logs.map(({ log, actor }) => (
                  <li key={log.id} className="px-5 py-2.5 text-sm">
                    <p className="truncate font-medium text-ink-900">
                      <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px]">{log.action}</code> <span className="text-steel-600">{log.entityType}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-steel-500">
                      {actor?.name ?? log.actorType} · {timeAgo(log.createdAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title={t("recentSignups")} action={<Link href="/admin/users" className="text-xs font-medium text-brand-700 hover:underline">{t("viewAll")}</Link>} />
          <CardContent className="p-0">
            <ul className="divide-y divide-steel-100">
              {signups.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${u.id}`} className="block truncate font-medium text-ink-900 hover:underline">
                      {u.name}
                    </Link>
                    <p className="truncate text-xs text-steel-500">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={u.status} size="sm" />
                    <span className="text-[11px] text-steel-500">{timeAgo(u.createdAt, locale)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
