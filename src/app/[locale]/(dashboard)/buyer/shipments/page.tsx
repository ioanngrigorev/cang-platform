import { Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerShipments } from "@/modules/logistics/queries";

export const metadata: Metadata = { title: "Shipments", robots: { index: false } };

export default async function BuyerShipmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("orders.shipments");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listBuyerShipments(company.id, { page });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button href="/buyer/logistics/new" variant="secondary">
            <Truck /> {t("colShipment")}
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={<Truck />} title={t("empty")} description={t("emptyDescription")} action={<Button href="/buyer/logistics/new" variant="primary">{t("title")}</Button>} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colShipment")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colMode")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden lg:table-cell">{t("colEta")}</TH>
                <TH className="hidden xl:table-cell">{t("colLast")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <Link href={`/buyer/shipments/${s.id}`} className="font-medium text-ink-900 hover:underline">
                      {s.shipmentNumber}
                    </Link>
                    <p className="text-xs text-steel-500">{s.carrier ?? s.provider?.name ?? "—"}</p>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {s.order ? (
                      <Link href={`/buyer/orders/${s.order.id}`} className="text-steel-600 hover:underline">
                        {s.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{humanize(s.mode)}</TD>
                  <TD>
                    <StatusBadge status={s.status} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{s.eta ? formatDate(s.eta, locale) : "—"}</TD>
                  <TD className="hidden max-w-[260px] text-xs text-steel-500 xl:table-cell">
                    {s.events[0] ? `${humanize(s.events[0].milestone)} · ${formatDateTime(s.events[0].occurredAt, locale)}` : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/shipments?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
