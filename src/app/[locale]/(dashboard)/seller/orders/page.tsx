import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, LinkTabs, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listSellerOrders, sellerOrderTabCounts, type OrderListTab } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

const TABS: OrderListTab[] = ["all", "active", "completed", "disputed", "cancelled"];

export default async function SellerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "orders.read", seller: true });
  const t = await getTranslations("sales.orders");

  const tab = (TABS.includes(sp.tab as OrderListTab) ? sp.tab : "all") as OrderListTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, counts] = await Promise.all([listSellerOrders(company.id, { tab, page }), sellerOrderTabCounts(company.id)]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/seller/orders?tab=${value}`, count: counts[value] }))} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button href="/seller/rfqs" variant="primary">
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
                <TH>{t("colBuyer")}</TH>
                <TH>{t("colTotal")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden xl:table-cell">{t("colNext")}</TH>
                <TH className="hidden sm:table-cell">{t("colPlaced")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((o) => {
                const held = o.payments.filter((p) => p.escrowStatus === "HELD" || p.escrowStatus === "PARTIALLY_RELEASED").reduce((s, p) => s + p.amount, 0);
                const awaiting = o.payments.filter((p) => p.status === "CREATED" || p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
                return (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/seller/orders/${o.id}`} className="font-medium text-ink-900 hover:underline">
                        {o.orderNumber}
                      </Link>
                      {o.shipments.length ? <p className="text-xs text-steel-500">{t("shipmentsCount", { count: o.shipments.length })}</p> : null}
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5 text-ink-900">
                        {o.buyerCompany.name}
                        <VerifiedMark status={o.buyerCompany.verificationStatus} />
                      </span>
                      <p className="text-xs text-steel-500">{o.buyerCompany.countryCode}</p>
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className="font-medium tabular-nums">{formatMoney(o.total, o.currency, locale)}</span>
                      {held > 0 ? <p className="text-xs text-success-700">{t("heldInEscrow", { amount: formatMoney(held, o.currency, locale) })}</p> : awaiting > 0 ? <p className="text-xs text-warning-700">{t("awaitingPayment", { amount: formatMoney(awaiting, o.currency, locale) })}</p> : null}
                    </TD>
                    <TD>
                      <StatusBadge status={o.statusCode} label={o.status ? localized(o.status, "name", locale) : undefined} />
                    </TD>
                    <TD className="hidden max-w-[340px] text-xs text-steel-600 xl:table-cell">{t(`next.${o.statusCode}`)}</TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(o.placedAt ?? o.createdAt, locale)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/orders?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
