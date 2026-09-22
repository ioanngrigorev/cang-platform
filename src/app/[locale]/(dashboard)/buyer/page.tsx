import {
  ArrowRight,
  Bell,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Landmark,
  MessageSquare,
  Package,
  Receipt,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, localized, timeAgo } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { activeBuyerOrders, buyerChecklist, buyerOverviewStats, recentBuyerRfqs, recentNotifications } from "@/modules/buyer/overview";

export const metadata: Metadata = { title: "Buyer dashboard", robots: { index: false } };

export default async function BuyerOverviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  const { user, company } = await requireCompany({ buyer: true });
  const t = await getTranslations("buyer.overview");

  const [stats, rfqs, orders, notifications, checklist] = await Promise.all([
    buyerOverviewStats(company.id, user.id),
    recentBuyerRfqs(company.id, 5),
    activeBuyerOrders(company.id, 5),
    recentNotifications(user.id, 6),
    buyerChecklist(company.id),
  ]);

  const awaiting = stats.awaitingPayment[0];
  const checklistDone = checklist.profileComplete && checklist.kybSubmitted && checklist.firstRfq;

  return (
    <>
      <PageHeader
        title={t("greeting", { name: user.name.split(" ")[0] })}
        description={t("subtitle")}
        actions={
          <>
            <Button href="/buyer/rfqs/new" variant="primary">
              <FileText /> {t("actionRfq")}
            </Button>
            <Button href="/manufacturers" variant="secondary">
              <Building2 /> {t("actionBrowse")}
            </Button>
          </>
        }
      />

      {welcome === "1" ? (
        <Alert variant="success" title={t("welcomeTitle", { name: company.name })} className="mb-6">
          <p>{t("welcomeBody")}</p>
          <Button href="/buyer/rfqs/new" variant="primary" size="sm" className="mt-3">
            {t("welcomeCta")} <ArrowRight />
          </Button>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
        <StatCard label={t("stats.openRfqs")} value={formatNumber(stats.openRfqs, locale)} hint={stats.draftRfqs ? t("stats.openRfqsHint", { drafts: stats.draftRfqs }) : undefined} icon={<FileText />} />
        <StatCard label={t("stats.quotations")} value={formatNumber(stats.quotationsReceived, locale)} hint={stats.newQuotations ? t("stats.quotationsHint", { count: stats.newQuotations }) : undefined} icon={<Receipt />} />
        <StatCard label={t("stats.activeOrders")} value={formatNumber(stats.activeOrders, locale)} icon={<Package />} />
        <StatCard
          label={t("stats.awaitingPayment")}
          value={awaiting ? formatMoney(awaiting.total, awaiting.currency, locale, { compact: awaiting.total > 100000 }) : formatMoney(0, "USD", locale)}
          hint={t("stats.awaitingPaymentHint")}
          icon={<CreditCard />}
        />
        <StatCard label={t("stats.messages")} value={formatNumber(stats.unreadMessages, locale)} icon={<MessageSquare />} />
        <StatCard label={t("stats.notifications")} value={formatNumber(stats.unreadNotifications, locale)} icon={<Bell />} />
      </div>

      {!checklistDone ? (
        <Card className="mt-6">
          <CardHeader title={t("checklist.title")} description={t("checklist.description")} />
          <CardContent className="space-y-3">
            <ChecklistRow done={checklist.profileComplete} title={t("checklist.profile")} hint={t("checklist.profileHint")} href="/buyer/company" cta={t("checklist.start")} doneLabel={t("checklist.done")} icon={<Building2 />} />
            <ChecklistRow
              done={checklist.kybVerified}
              title={t("checklist.kyb")}
              hint={checklist.kybSubmitted && !checklist.kybVerified ? t("checklist.kybPending") : t("checklist.kybHint")}
              href="/buyer/company/verification"
              cta={t("checklist.start")}
              doneLabel={t("checklist.done")}
              icon={<BadgeCheck />}
            />
            <ChecklistRow done={checklist.firstRfq} title={t("checklist.rfq")} hint={t("checklist.rfqHint")} href="/buyer/rfqs/new" cta={t("checklist.start")} doneLabel={t("checklist.done")} icon={<FileText />} />
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title={t("recentRfqs")} action={<Button href="/buyer/rfqs" variant="link" size="sm">{t("viewAll")}</Button>} />
          <CardContent className="p-0">
            {rfqs.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<FileText />} title={t("noRfqs")} action={<Button href="/buyer/rfqs/new" variant="primary" size="sm">{t("actionRfq")}</Button>} />
              </div>
            ) : (
              <ul className="divide-y divide-steel-100">
                {rfqs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/buyer/rfqs/${r.id}`} className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-steel-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{r.title}</p>
                        <p className="mt-0.5 text-xs text-steel-500">
                          {r.rfqNumber} · {formatNumber(r.quantity, locale)} {r.unit} · {t("quotationsFor", { count: r.quotationCount })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={r.status} size="sm" />
                        <span className="text-xs text-steel-400">{timeAgo(r.createdAt, locale)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("quickActions")} />
          <CardContent className="grid gap-2">
            <QuickAction href="/buyer/rfqs/new" icon={<FileText />} label={t("actionRfq")} />
            <QuickAction href="/manufacturers" icon={<Building2 />} label={t("actionBrowse")} />
            <QuickAction href="/buyer/logistics/new" icon={<Truck />} label={t("actionLogistics")} />
            <QuickAction href="/buyer/financing/new" icon={<Landmark />} label={t("actionFinancing")} />
            <QuickAction href="/buyer/inspections" icon={<ClipboardCheck />} label={t("actionInspection")} />
            <QuickAction href="/buyer/messages" icon={<MessageSquare />} label={t("actionMessages")} badge={stats.unreadMessages} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title={t("activeOrders")} action={<Button href="/buyer/orders" variant="link" size="sm">{t("viewAll")}</Button>} />
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<Package />} title={t("noOrders")} />
              </div>
            ) : (
              <ul className="divide-y divide-steel-100">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/buyer/orders/${o.id}`} className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-steel-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">{o.supplierCompany.name}</p>
                        <p className="mt-0.5 text-xs text-steel-500">
                          {o.orderNumber} · {formatMoney(o.total, o.currency, locale)}
                          {o.expectedDeliveryDate ? ` · ETA ${formatDate(o.expectedDeliveryDate, locale)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={o.statusCode} label={o.status ? localized(o.status, "name", locale) : undefined} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("notifications")} action={<Button href="/buyer/notifications" variant="link" size="sm">{t("viewAll")}</Button>} />
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-steel-500">{t("noNotifications")}</p>
            ) : (
              <ul className="divide-y divide-steel-100">
                {notifications.map((n) => (
                  <li key={n.id} className="px-5 py-3">
                    {n.link ? (
                      <Link href={n.link} className="block">
                        <NotificationBody n={n} locale={locale} />
                      </Link>
                    ) : (
                      <NotificationBody n={n} locale={locale} />
                    )}
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

function NotificationBody({ n, locale }: { n: { title: string; body: string | null; readAt: Date | null; createdAt: Date }; locale: string }) {
  return (
    <>
      <p className={n.readAt ? "text-sm text-steel-600" : "text-sm font-medium text-ink-900"}>{n.title}</p>
      {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-steel-500">{n.body}</p> : null}
      <p className="mt-0.5 text-xs text-steel-400">{timeAgo(n.createdAt, locale)}</p>
    </>
  );
}

function QuickAction({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md border border-steel-200 px-3 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-steel-300 hover:bg-steel-50">
      <span className="text-steel-500 [&_svg]:size-4">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <Badge variant="ink" size="sm">
          {badge}
        </Badge>
      ) : (
        <ArrowRight className="size-4 text-steel-300" />
      )}
    </Link>
  );
}

function ChecklistRow({ done, title, hint, href, cta, doneLabel, icon }: { done: boolean; title: string; hint: string; href: string; cta: string; doneLabel: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-steel-200 px-3 py-3">
      <span className={done ? "mt-0.5 text-success-600 [&_svg]:size-5" : "mt-0.5 text-steel-400 [&_svg]:size-5"}>{done ? <CheckCircle2 /> : icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="mt-0.5 text-xs text-steel-500">{hint}</p>
      </div>
      {done ? (
        <Badge variant="success" size="sm">
          {doneLabel}
        </Badge>
      ) : (
        <Button href={href} variant="secondary" size="xs">
          {cta}
        </Button>
      )}
    </div>
  );
}
