import { Plus, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, Button, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listBuyerLogisticsRequests } from "@/modules/logistics/queries";

export const metadata: Metadata = { title: "Logistics", robots: { index: false } };

export default async function BuyerLogisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "logistics.manage", buyer: true });
  const t = await getTranslations("logistics.list");
  const ts = await getTranslations("logistics.services");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const { rows, totalPages } = await listBuyerLogisticsRequests(company.id, { page });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button href="/buyer/logistics/new" variant="primary">
            <Plus /> {t("new")}
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Truck />}
          title={t("empty")}
          description={t("emptyDescription")}
          action={
            <Button href="/buyer/logistics/new" variant="primary">
              <Plus /> {t("new")}
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colRequest")}</TH>
                <TH>{t("colRoute")}</TH>
                <TH className="hidden lg:table-cell">{t("colServices")}</TH>
                <TH>{t("colQuotes")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden sm:table-cell">{t("colCreated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/buyer/logistics/${r.id}`} className="font-medium text-ink-900 hover:underline">
                      {r.requestNumber}
                    </Link>
                    {r.order ? <p className="text-xs text-steel-500">{t("order", { number: r.order.orderNumber })}</p> : null}
                  </TD>
                  <TD className="whitespace-nowrap text-steel-600">
                    {r.originCountryCode} → {r.destinationCountryCode}
                  </TD>
                  <TD className="hidden max-w-[300px] lg:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {r.services.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" size="sm">
                          {ts(s)}
                        </Badge>
                      ))}
                      {r.services.length > 3 ? <Badge variant="outline" size="sm">+{r.services.length - 3}</Badge> : null}
                    </span>
                  </TD>
                  <TD>{t("quotesCount", { count: r.quotes.length })}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(r.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/logistics?page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
