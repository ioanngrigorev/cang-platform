import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, localized } from "@/lib/utils";
import { ADMIN_ORDER_TABS, adminOrderTabCounts, listAdminOrders } from "@/modules/admin/orders/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { requireAdmin } from "@/modules/auth/current-user";
import type { OrderListTab } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function AdminOrdersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin("admin.orders.read");
  const t = await getTranslations("admin.orders");
  const tc = await getTranslations("admin.common");
  const tab = (ADMIN_ORDER_TABS.includes(str(sp.tab) as OrderListTab) ? str(sp.tab) : "all") as OrderListTab;
  const q = str(sp.q);
  const page = pageParam(sp.page);
  const [{ rows, page: p, totalPages }, counts] = await Promise.all([listAdminOrders({ tab, q, page }), adminOrderTabCounts()]);

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={tab} className="mb-4" tabs={ADMIN_ORDER_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: qs("/admin/orders", { tab: value, q }), count: counts[value] }))} />
      <FilterBar q={q} qPlaceholder={t("searchPlaceholder")} keep={{ tab }} submitLabel={tc("search")} clearHref={qs("/admin/orders", { tab })} clearLabel={tc("clear")} className="mb-5" />
      {rows.length === 0 ? (
        <EmptyState icon={<Package />} title={t("emptyTitle")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colOrder")}</TH>
                <TH>{t("colBuyer")}</TH>
                <TH>{t("colSupplier")}</TH>
                <TH className="text-right">{t("colTotal")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden md:table-cell">{t("colPlaced")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((o) => (
                <TR key={o.id}>
                  <TD>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink-900 hover:underline">
                      {o.orderNumber}
                    </Link>
                    {o.tradeAssuranceEnabled ? <Badge size="sm" variant="success" className="ml-2">TA</Badge> : null}
                  </TD>
                  <TD>
                    <Link href={`/admin/companies/${o.buyer.id}`} className="hover:underline">
                      {o.buyer.name}
                    </Link>
                  </TD>
                  <TD>
                    <Link href={`/admin/companies/${o.supplier.id}`} className="hover:underline">
                      {o.supplier.name}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap text-right font-medium tabular-nums">{formatMoney(o.total, o.currency, locale)}</TD>
                  <TD>
                    <StatusBadge status={o.statusCode} label={o.status ? localized(o.status, "name", locale) : undefined} size="sm" />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{formatDate(o.placedAt ?? o.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/orders", { tab, q, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
