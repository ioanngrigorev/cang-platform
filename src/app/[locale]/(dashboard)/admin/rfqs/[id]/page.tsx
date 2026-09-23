import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RfqAdminActions } from "@/components/admin/rfq-actions";
import { Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, formatMoney, localized } from "@/lib/utils";
import { getAdminRfq } from "@/modules/admin/rfqs/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "RFQ", robots: { index: false } };

export default async function AdminRfqDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.rfqs.read");
  const t = await getTranslations("admin.rfqs");
  const tc = await getTranslations("admin.common");
  const r = await getAdminRfq(id);
  if (!r) notFound();

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/rfqs" }, { label: r.rfqNumber }]}
        eyebrow={r.rfqNumber}
        title={r.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <Badge variant="outline">{t(`visibility.${r.visibility}`)}</Badge>
            {r.isPriority ? <Badge variant="brass">{t("priority")}</Badge> : null}
            <Link href={`/admin/companies/${r.buyerCompany.id}`} className="hover:underline">
              {r.buyerCompany.name}
            </Link>
            <span>· {formatDateTime(r.createdAt, locale)}</span>
          </span>
        }
        actions={<RfqAdminActions rfqId={r.id} status={r.status} visibility={r.visibility} canWrite={canPlatform(auth, "admin.rfqs.write")} />}
      />

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("request")} />
            <CardContent className="space-y-4">
              <DataList
                columns={3}
                items={[
                  { label: t("colCategory"), value: r.category ? localized(r.category, "name", locale) : "—" },
                  { label: t("colQuantity"), value: `${r.quantity.toLocaleString()} ${r.unit}` },
                  { label: t("targetPrice"), value: r.targetPrice != null ? formatMoney(r.targetPrice, r.targetCurrency, locale) : "—" },
                  { label: t("destination"), value: [r.destinationCity, r.destinationCountry ? localized(r.destinationCountry, "name", locale) : r.destinationCountryCode].filter(Boolean).join(", ") || "—" },
                  { label: t("incoterm"), value: r.incoterm ?? "—" },
                  { label: t("paymentTerms"), value: r.preferredPaymentTerms ?? "—" },
                  { label: t("colDeadline"), value: r.quoteDeadline ? formatDate(r.quoteDeadline, locale) : "—" },
                  { label: t("deliveryDate"), value: r.requiredDeliveryDate ? formatDate(r.requiredDeliveryDate, locale) : "—" },
                  { label: t("sample"), value: r.sampleRequired ? tc("yes") : tc("no") },
                  { label: t("views"), value: r.viewCount },
                  { label: t("createdBy"), value: <Link href={`/admin/users/${r.createdBy.id}`} className="hover:underline">{r.createdBy.name}</Link> },
                  { label: t("published"), value: r.publishedAt ? formatDateTime(r.publishedAt, locale) : "—" },
                ]}
              />
              <p className="whitespace-pre-wrap text-sm text-steel-600">{r.description}</p>
              {r.certificationRequirements || r.customizationRequirements || r.packagingRequirements ? (
                <DataList
                  columns={3}
                  items={[
                    { label: t("certifications"), value: r.certificationRequirements ?? "—" },
                    { label: t("customization"), value: r.customizationRequirements ?? "—" },
                    { label: t("packaging"), value: r.packagingRequirements ?? "—" },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>

          {r.items.length ? (
            <Card>
              <CardHeader title={t("lineItems")} />
              <CardContent className="p-0">
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("item")}</TH>
                      <TH className="text-right">{t("colQuantity")}</TH>
                      <TH className="text-right">{t("targetPrice")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {r.items.map((i) => (
                      <TR key={i.id}>
                        <TD>
                          <span className="font-medium">{i.productName}</span>
                          {i.specifications ? <p className="text-xs text-steel-500">{i.specifications}</p> : null}
                        </TD>
                        <TD className="text-right tabular-nums">
                          {i.quantity.toLocaleString()} {i.unit}
                        </TD>
                        <TD className="text-right tabular-nums">{i.targetPrice != null ? formatMoney(i.targetPrice, r.targetCurrency, locale) : "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t("quotations")} description={t("quotationsHint", { count: r.quotations.length })} />
            <CardContent className="p-0">
              {r.quotations.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noQuotations")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("quotation")}</TH>
                      <TH>{t("supplier")}</TH>
                      <TH className="text-right">{t("total")}</TH>
                      <TH className="hidden md:table-cell text-right">{t("leadTime")}</TH>
                      <TH>{tc("status")}</TH>
                      <TH className="hidden sm:table-cell">{t("submitted")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {r.quotations.map((q) => (
                      <TR key={q.id} className={r.awardedQuotationId === q.id ? "bg-success-50/40" : undefined}>
                        <TD className="font-medium">
                          {q.quotationNumber}
                          {q.revisionNumber > 1 ? <span className="ml-1 text-xs text-steel-500">v{q.revisionNumber}</span> : null}
                        </TD>
                        <TD>
                          <Link href={`/admin/companies/${q.supplierCompany.id}`} className="hover:underline">
                            {q.supplierCompany.name}
                          </Link>
                        </TD>
                        <TD className="text-right tabular-nums">{formatMoney(q.total, q.currency, locale)}</TD>
                        <TD className="hidden text-right tabular-nums md:table-cell">{q.leadTimeDays ? `${q.leadTimeDays} d` : "—"}</TD>
                        <TD>
                          <StatusBadge status={q.status} size="sm" />
                        </TD>
                        <TD className="hidden whitespace-nowrap text-xs text-steel-600 sm:table-cell">{q.submittedAt ? formatDate(q.submittedAt, locale) : "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("invitations")} description={t("invitationsHint", { count: r.invitations.length })} />
            <CardContent className="p-0">
              {r.invitations.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {r.invitations.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                      <Link href={`/admin/companies/${i.supplierCompanyId}`} className="truncate hover:underline">
                        {i.supplier.name}
                      </Link>
                      <StatusBadge status={i.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("attachments")} />
            <CardContent className="p-0">
              {r.documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {r.documents.map((d) => (
                    <li key={d.id} className="px-5 py-2.5 text-sm">
                      <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-ink-900 hover:underline">
                        {d.name}
                      </a>
                      <p className="text-xs text-steel-500">{(d.sizeBytes / 1024).toFixed(0)} KB</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
