import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerOrders, orderTabCounts, type OrderListTab } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

const TABS: OrderListTab[] = ["all", "active", "completed", "disputed", "cancelled"];

export default async function BuyerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("orders.list");
  const td = await getTranslations("orders.detail");

  const tab = (TABS.includes(sp.tab as OrderListTab) ? sp.tab : "all") as OrderListTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, counts] = await Promise.all([listBuyerOrders(company.id, { tab, page }), orderTabCounts(company.id)]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/buyer/orders?tab=${value}`, count: counts[value] }))} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button href="/buyer/rfqs" variant="primary">
              {t("emptyAction")}
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colOrder")}</TH>
                <TH>{t("colSupplier")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden xl:table-cell">{t("colNext")}</TH>
                <TH className="hidden sm:table-cell">{t("colPlaced")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((o) => {
                const outstanding = o.payments.filter((p) => p.status === "CREATED" || p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
                return (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/buyer/orders/${o.id}`} className="font-medium text-ink-900 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={`/supplier/${o.supplierCompany.slug}`} className="text-ink-900 hover:underline">
                        {o.supplierCompany.name}
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className="font-medium tabular-nums">{formatMoney(o.total, o.currency, locale)}</span>
                      {outstanding > 0 ? <p className="text-xs text-warning-700">{t("outstanding", { amount: formatMoney(outstanding, o.currency, locale) })}</p> : null}
                    </TD>
                    <TD>
                      <StatusBadge status={o.statusCode} label={o.status ? localized(o.status, "name", locale) : undefined} />
                    </TD>
                    <TD className="hidden max-w-[340px] text-xs text-steel-600 xl:table-cell">{td(`next.${o.statusCode}`)}</TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(o.placedAt ?? o.createdAt, locale)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/orders?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
