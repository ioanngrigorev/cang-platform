import { Download } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CancelInspection } from "@/components/buyer/inspection-actions";
import { Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getBuyerInspection } from "@/modules/inspection/queries";

export const metadata: Metadata = { title: "Inspection", robots: { index: false } };

const CANCELLABLE = ["REQUESTED", "QUOTED", "SCHEDULED"];

export default async function BuyerInspectionDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "orders.read", buyer: true });
  const t = await getTranslations("buyer.inspections");

  const i = await getBuyerInspection(company.id, id);
  if (!i) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("back"), href: "/buyer/inspections" },
          { label: i.inspectionNumber },
        ]}
        title={t("detailTitle", { number: i.inspectionNumber })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={i.status} />
            {i.result !== "PENDING" ? <StatusBadge status={i.result} /> : null}
            <span>{humanize(i.type)}</span>
          </span>
        }
        actions={
          <>
            {i.order ? (
              <Button href={`/buyer/orders/${i.order.id}`} variant="secondary">
                {t("viewOrder")}
              </Button>
            ) : null}
            {CANCELLABLE.includes(i.status) ? <CancelInspection inspectionId={i.id} /> : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("checklist")} />
            <CardContent className="p-0">
              {!i.checklist?.length ? (
                <p className="px-5 py-4 text-sm text-steel-500">{t("noChecklist")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("checklistItem")}</TH>
                      <TH>{t("checklistResult")}</TH>
                      <TH>{t("checklistNote")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {i.checklist.map((c, idx) => (
                      <TR key={idx}>
                        <TD className="font-medium">{c.item}</TD>
                        <TD>{c.result ? <StatusBadge status={c.result.toUpperCase()} size="sm" /> : "—"}</TD>
                        <TD className="text-steel-600">{c.note ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("findings")} />
            <CardContent>
              {i.findings ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-900">{i.findings}</p> : <p className="text-sm text-steel-500">{t("noFindings")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("report")} />
            <CardContent>
              {i.reportDocument ? (
                <Button href={i.reportDocument.url} variant="secondary">
                  <Download /> {t("downloadReport")}
                </Button>
              ) : (
                <p className="text-sm text-steel-500">{t("noReport")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("detailTitle", { number: i.inspectionNumber })} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("type"), value: humanize(i.type) },
                  { label: t("provider"), value: i.provider?.name ?? "—" },
                  { label: t("requestedDate"), value: i.requestedDate ? formatDate(i.requestedDate, locale) : "—" },
                  { label: t("scheduledAt"), value: i.scheduledAt ? formatDate(i.scheduledAt, locale) : "—" },
                  { label: t("completedAt"), value: i.completedAt ? formatDate(i.completedAt, locale) : "—" },
                  { label: t("factoryAddress"), value: i.factoryAddress ?? "—" },
                  { label: t("fee"), value: i.fee ? formatMoney(i.fee, i.currency, locale) : "—" },
                  { label: t("result"), value: <StatusBadge status={i.result} /> },
                  ...(i.notes ? [{ label: t("notes"), value: i.notes }] : []),
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
