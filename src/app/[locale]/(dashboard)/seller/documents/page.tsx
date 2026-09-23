import { FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, LinkTabs, PageHeader, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listCompanyDocuments, listCounterpartyDocuments } from "@/modules/company-profile/buyer-queries";
import { sellerOrderIds } from "@/modules/seller/overview";

export const metadata: Metadata = { title: "Documents", robots: { index: false } };

export default async function SellerDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "company.profile.read", seller: true });
  const t = await getTranslations("seller.documents");

  const tab = sp.tab === "counterparty" ? "counterparty" : "ours";
  const orderIds = tab === "counterparty" ? await sellerOrderIds(company.id) : [];
  const rows = tab === "counterparty" ? await listCounterpartyDocuments(company.id, orderIds) : await listCompanyDocuments(company.id);
  const ours = tab === "ours";

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <LinkTabs
        current={tab}
        className="mb-5"
        tabs={[
          { value: "ours", label: t("tabs.ours"), href: "/seller/documents?tab=ours" },
          { value: "counterparty", label: t("tabs.counterparty"), href: "/seller/documents?tab=counterparty" },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("colName")}</TH>
              <TH className="hidden sm:table-cell">{t("colType")}</TH>
              <TH className="hidden md:table-cell">{t("colContext")}</TH>
              {ours ? null : <TH className="hidden lg:table-cell">{t("colOwner")}</TH>}
              <TH className="hidden lg:table-cell">{t("colSize")}</TH>
              <TH>{t("colUploaded")}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((d) => (
              <TR key={d.id}>
                <TD>
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-ink-900 hover:underline">
                    {d.name}
                  </a>
                </TD>
                <TD className="hidden text-steel-600 sm:table-cell">{humanize(d.type)}</TD>
                <TD className="hidden text-steel-600 md:table-cell">
                  {d.order ? (
                    <Link href={`/seller/orders/${d.order.id}`} className="hover:underline">
                      {d.order.orderNumber}
                    </Link>
                  ) : "rfq" in d && d.rfq ? (
                    <Link href={`/seller/rfqs/${d.rfq.id}`} className="hover:underline">
                      {d.rfq.rfqNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                {ours ? null : <TD className="hidden text-steel-600 lg:table-cell">{"ownerCompany" in d && d.ownerCompany ? d.ownerCompany.name : "—"}</TD>}
                <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{(d.sizeBytes / 1024).toFixed(0)} KB</TD>
                <TD className="whitespace-nowrap text-steel-600">{formatDate(d.createdAt, locale)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
