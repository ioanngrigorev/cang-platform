import { Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { shipmentStatusLabels } from "@/modules/logistics/tracking/labels";
import { CreateShipmentButton } from "@/components/seller/sales/shipment-actions";
import { EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { sellerOrderOptions } from "@/modules/orders/queries";
import { listActiveProviders } from "@/modules/logistics/tracking/queries";
import { listSellerShipments } from "@/modules/seller/sales/shipments/queries";
import { SHIPPABLE_ORDER_STATUSES } from "@/modules/seller/sales/shipments/schemas";

export const metadata: Metadata = { title: "Shipments", robots: { index: false } };

export default async function SellerShipmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "orders.read", seller: true });
  const t = await getTranslations("sales.shipments");
  const statusLabels = await shipmentStatusLabels();
  const ts = await getTranslations("orders.shipments");
  const tm = await getTranslations("logistics.modes");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, shippable, providers] = await Promise.all([listSellerShipments(company.id, { page }), sellerOrderOptions(company.id, SHIPPABLE_ORDER_STATUSES), listActiveProviders()]);
  const orderOptions = shippable.map((o) => ({ id: o.id, orderNumber: o.orderNumber, buyerName: o.buyerName }));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<CreateShipmentButton orders={orderOptions} providers={providers} />} />

      {rows.length === 0 ? (
        <EmptyState icon={<Truck />} title={t("empty")} description={shippable.length ? t("emptyDescriptionShippable", { count: shippable.length }) : t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colShipment")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colMode")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden lg:table-cell">{t("colEtd")}</TH>
                <TH className="hidden lg:table-cell">{t("colEta")}</TH>
                <TH className="hidden xl:table-cell">{t("colLast")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <Link href={`/seller/shipments/${s.id}`} className="font-medium text-ink-900 hover:underline">
                      {s.shipmentNumber}
                    </Link>
                    <p className="text-xs text-steel-500">
                      {s.carrier ?? s.provider?.name ?? "—"}
                      {s.trackingNumber ? ` · ${s.trackingNumber}` : ""}
                    </p>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {s.order ? (
                      <>
                        <Link href={`/seller/orders/${s.order.id}`} className="text-ink-900 hover:underline">
                          {s.order.orderNumber}
                        </Link>
                        <p className="text-xs text-steel-500">{s.order.buyerCompany?.name}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{tm(s.mode)}</TD>
                  <TD>
                    <StatusBadge status={s.status} label={statusLabels[s.status]} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{s.etd ? formatDate(s.etd, locale) : "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{s.eta ? formatDate(s.eta, locale) : "—"}</TD>
                  <TD className="hidden max-w-[260px] text-xs text-steel-500 xl:table-cell">
                    {s.events[0] ? `${ts.has(`milestoneLabels.${s.events[0].milestone}`) ? ts(`milestoneLabels.${s.events[0].milestone}`) : humanize(s.events[0].milestone)} · ${formatDateTime(s.events[0].occurredAt, locale)}` : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/shipments?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
