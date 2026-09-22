import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listCompanyDisputes } from "@/modules/disputes/queries";

export const metadata: Metadata = { title: "Disputes", robots: { index: false } };

export default async function BuyerDisputesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "disputes.manage", buyer: true });
  const t = await getTranslations("buyer.disputes");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listCompanyDisputes(company.id, { page });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {rows.length === 0 ? (
        <EmptyState icon={<ShieldAlert />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colDispute")}</TH>
                <TH className="hidden sm:table-cell">{t("colOrder")}</TH>
                <TH className="hidden md:table-cell">{t("colType")}</TH>
                <TH>{t("colAmount")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden lg:table-cell">{t("colOpened")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ dispute: d, order, respondent }) => (
                <TR key={d.id}>
                  <TD>
                    <Link href={`/buyer/disputes/${d.id}`} className="font-medium text-ink-900 hover:underline">
                      {d.disputeNumber}
                    </Link>
                    <p className="line-clamp-1 text-xs text-steel-500">{d.title}</p>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <Link href={`/buyer/orders/${order.id}`} className="text-steel-600 hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-steel-500">{respondent.name}</p>
                  </TD>
                  <TD className="hidden text-steel-600 md:table-cell">{humanize(d.type)}</TD>
                  <TD className="whitespace-nowrap tabular-nums">{d.claimedAmount ? formatMoney(d.claimedAmount, d.currency, locale) : "—"}</TD>
                  <TD>
                    <StatusBadge status={d.status} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{formatDate(d.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/disputes?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
