import { Search, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { STATUS_BADGE } from "@/components/logistics/shipment-timeline";
import { Badge, Button, Card, EmptyState, Input, LinkTabs, PageHeader, Pagination, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { Address } from "@/db/schema/orders";
import { isTerminal, statusTone } from "@/modules/logistics/tracking/statuses";
import { requirePartner } from "@/modules/partner/context";
import { PARTNER_TABS, STALE_HOURS, listPartnerShipments, partnerOverview, type PartnerTab } from "@/modules/partner/queries";

export const metadata: Metadata = { title: "Shipments", robots: { index: false } };

function place(a: Address | null | undefined) {
  return a ? [a.city, a.countryCode].filter(Boolean).join(", ") : null;
}

export default async function PartnerShipmentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const { provider } = await requirePartner();
  const t = await getTranslations("partner");
  const tt = await getTranslations("tracking");
  const tm = await getTranslations("logistics.modes");
  const tab: PartnerTab = (PARTNER_TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as PartnerTab) : "active";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const q = sp.q?.trim() || null;
  const [stats, result] = await Promise.all([partnerOverview(provider.id), listPartnerShipments(provider.id, { tab, q, page })]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const href = (p: { tab?: string; page?: number }) => {
    const qs = new URLSearchParams();
    qs.set("tab", p.tab ?? tab);
    if (q) qs.set("q", q);
    if (p.page && p.page > 1) qs.set("page", String(p.page));
    return `/partner/shipments?${qs.toString()}`;
  };
  const counts: Record<PartnerTab, number | undefined> = { active: stats.active, pickup: stats.pickup, transit: stats.transit, delivery: stats.delivery, problems: stats.problems, done: stats.done, all: undefined };
  const staleBefore = Date.now() - STALE_HOURS * 3600 * 1000;

  return (
    <>
      <PageHeader title={t("list.title")} description={t("list.description")} />
      <LinkTabs current={tab} className="mb-4" tabs={PARTNER_TABS.map((v) => ({ value: v, label: t(`tabs.${v}`), href: href({ tab: v }), count: counts[v] }))} />
      <form className="mb-4 flex max-w-lg gap-2" action={`/${locale}/partner/shipments`}>
        <input type="hidden" name="tab" value={tab} />
        <Input name="q" defaultValue={q ?? ""} placeholder={t("list.searchPlaceholder")} aria-label={t("list.searchPlaceholder")} />
        <Button type="submit" variant="secondary">
          <Search /> {t("list.search")}
        </Button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState icon={<Truck />} title={t("list.empty")} description={t("list.emptyHint")} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>{t("list.colShipment")}</TH>
                  <TH>{t("list.colRoute")}</TH>
                  <TH>{t("list.colStatus")}</TH>
                  <TH>{t("list.colTracking")}</TH>
                  <TH>{t("list.colEta")}</TH>
                  <TH>{t("list.colUpdated")}</TH>
                </TR>
              </THead>
              <TBody>
                {result.rows.map((s) => {
                  const overdue = s.eta && s.eta.getTime() < Date.now() && !isTerminal(s.status);
                  const last = s.lastEventAt ?? s.createdAt;
                  const stale = !isTerminal(s.status) && last.getTime() < staleBefore;
                  return (
                    <TR key={s.id}>
                      <TD>
                        <Link href={`/partner/shipments/${s.id}`} className="font-mono text-sm font-medium text-ink-900 hover:underline">
                          {s.shipmentNumber}
                        </Link>
                        <p className="text-xs text-steel-500">
                          {s.orderNumber} · {tm(s.mode)}
                        </p>
                      </TD>
                      <TD className="text-sm">
                        <p className="text-ink-900">{s.supplierName}{s.supplierCity ? `, ${s.supplierCity}` : ""}</p>
                        <p className="text-xs text-steel-500">→ {s.destinationPort ?? place(s.destinationAddress) ?? s.buyerCountry} · {s.buyerName}</p>
                      </TD>
                      <TD>
                        <Badge variant={STATUS_BADGE[statusTone(s.status)]} size="sm">{tt(`status.${s.status}`)}</Badge>
                        {s.exceptionReason ? <p className="mt-0.5 text-xs text-warning-700">{tt(`reasons.${s.exceptionReason}`)}</p> : null}
                      </TD>
                      <TD className="text-sm">
                        {s.trackingNumber ? <span className="font-mono">{s.trackingNumber}</span> : <span className="text-steel-400">—</span>}
                        {s.carrier ? <p className="text-xs text-steel-500">{s.carrier}</p> : null}
                      </TD>
                      <TD className={cn("text-sm", overdue && "font-medium text-danger-600")}>{s.eta ? formatDate(s.eta, locale) : "—"}</TD>
                      <TD className={cn("text-sm", stale ? "font-medium text-warning-700" : "text-steel-600")}>{timeAgo(last, locale)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
          <Pagination page={result.page} totalPages={totalPages} hrefFor={(p) => href({ page: p })} className="mt-6" />
        </>
      )}
    </>
  );
}
