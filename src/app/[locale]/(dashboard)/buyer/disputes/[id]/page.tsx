import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CloseDisputeButton, DisputeThread } from "@/components/buyer/dispute-thread";
import { Alert, Button, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getCompanyDispute } from "@/modules/disputes/queries";

export const metadata: Metadata = { title: "Dispute", robots: { index: false } };

const CLOSED = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"];

export default async function BuyerDisputeDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { company } = await requireCompany({ permission: "disputes.manage", buyer: true });
  const t = await getTranslations("buyer.disputes");

  const d = await getCompanyDispute(company.id, id);
  if (!d) notFound();

  const closed = CLOSED.includes(d.status);
  const isRaiser = d.raisedByCompanyId === company.id;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("back"), href: "/buyer/disputes" },
          { label: d.disputeNumber },
        ]}
        eyebrow={d.disputeNumber}
        title={d.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            <span>{humanize(d.type)}</span>
            {d.claimedAmount ? <span>· {formatMoney(d.claimedAmount, d.currency, locale)}</span> : null}
          </span>
        }
        actions={
          <>
            <Button href={`/buyer/orders/${d.order.id}`} variant="secondary">
              {d.order.orderNumber}
            </Button>
            {isRaiser && !closed ? <CloseDisputeButton disputeId={d.id} /> : null}
          </>
        }
      />

      {d.resolution ? (
        <Alert variant={closed ? "success" : "info"} title={t("resolution")} className="mb-6">
          {d.resolution}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader title={t("thread")} />
          <CardContent>
            <DisputeThread
              disputeId={d.id}
              locale={locale}
              closed={closed}
              messages={d.messages.map((m) => ({
                id: m.id,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
                author: m.author ? { id: m.author.id, name: m.author.name } : null,
                isMine: d.companyByUser[m.authorId] === company.id,
              }))}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("summary")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("type"), value: humanize(d.type) },
                  { label: t("claimed"), value: d.claimedAmount ? formatMoney(d.claimedAmount, d.currency, locale) : "—" },
                  { label: t("raisedBy"), value: d.raisedByCompany.name },
                  { label: t("respondent"), value: d.respondentCompany.name },
                  { label: t("order"), value: `${d.order.orderNumber} · ${formatMoney(d.order.total, d.order.currency, locale)}` },
                  { label: t("opened"), value: formatDate(d.createdAt, locale) },
                  { label: t("respondBy"), value: d.respondBy ? formatDate(d.respondBy, locale) : "—" },
                ]}
              />
              <div className="mt-4 border-t border-steel-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("summary")}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{d.description}</p>
              </div>
            </CardContent>
          </Card>

          {d.documents.length ? (
            <Card>
              <CardHeader title={t("documents")} />
              <CardContent className="p-0">
                <ul className="divide-y divide-steel-100">
                  {d.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 px-5 py-3 text-sm">
                      <FileText className="size-4 shrink-0 text-steel-400" />
                      <a href={doc.url} target="_blank" rel="noreferrer" className="truncate font-medium text-ink-900 hover:underline">
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
