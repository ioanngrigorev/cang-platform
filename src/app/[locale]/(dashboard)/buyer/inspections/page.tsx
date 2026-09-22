import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerInspections } from "@/modules/inspection/queries";

export const metadata: Metadata = { title: "Inspections", robots: { index: false } };

export default async function BuyerInspectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("buyer.inspections");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listBuyerInspections(company.id, { page });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardCheck />} title={t("empty")} description={t("emptyHint")} action={<Button href="/buyer/orders" variant="primary">{t("colOrder")}</Button>} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colInspection")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH>{t("colType")}</TH>
                <TH className="hidden lg:table-cell">{t("colProvider")}</TH>
                <TH className="hidden md:table-cell">{t("colDate")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH>{t("colResult")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <Link href={`/buyer/inspections/${i.id}`} className="font-medium text-ink-900 hover:underline">
                      {i.inspectionNumber}
                    </Link>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {i.order ? (
                      <Link href={`/buyer/orders/${i.order.id}`} className="text-steel-600 hover:underline">
                        {i.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-steel-600">{humanize(i.type)}</TD>
                  <TD className="hidden text-steel-600 lg:table-cell">{i.provider?.name ?? "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 md:table-cell">
                    {i.scheduledAt ? formatDate(i.scheduledAt, locale) : i.requestedDate ? formatDate(i.requestedDate, locale) : "—"}
                  </TD>
                  <TD>
                    <StatusBadge status={i.status} />
                  </TD>
                  <TD>{i.result === "PENDING" ? <span className="text-steel-400">—</span> : <StatusBadge status={i.result} />}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/inspections?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
