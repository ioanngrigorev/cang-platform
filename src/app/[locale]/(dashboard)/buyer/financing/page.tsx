import { Landmark, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CreditScoreCard } from "@/components/buyer/credit-score-card";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, PageHeader, Pagination, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { buyerFinancingPartners, latestCreditScore, listCompanyFinancing } from "@/modules/financing/queries";

export const metadata: Metadata = { title: "Financing", robots: { index: false } };

export default async function BuyerFinancingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "financing.apply", buyer: true });
  const t = await getTranslations("financing.list");
  const tf = await getTranslations("financing.form");

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages }, score, partners] = await Promise.all([listCompanyFinancing(company.id, { page }), latestCreditScore(company.id), buyerFinancingPartners(company.countryCode)]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button href="/buyer/financing/new" variant="primary">
            <Plus /> {t("new")}
          </Button>
        }
      />

      <div className="mb-6">
        <CreditScoreCard
          locale={locale}
          snapshot={
            score
              ? { score: score.score, grade: score.grade, computedAt: score.computedAt.toISOString(), features: score.features, breakdown: score.breakdown }
              : null
          }
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Landmark />}
          title={t("empty")}
          description={t("emptyDescription")}
          action={
            <Button href="/buyer/financing/new" variant="primary">
              <Plus /> {t("new")}
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colApplication")}</TH>
                <TH>{t("colProduct")}</TH>
                <TH>{t("colAmount")}</TH>
                <TH className="hidden md:table-cell">{t("colProvider")}</TH>
                <TH>{t("colStatus")}</TH>
                <TH className="hidden sm:table-cell">{t("colCreated")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link href={`/buyer/financing/${a.id}`} className="font-medium text-ink-900 hover:underline">
                      {a.applicationNumber}
                    </Link>
                    {a.order ? <p className="text-xs text-steel-500">{a.order.orderNumber}</p> : null}
                  </TD>
                  <TD className="text-steel-600">{humanize(a.productType)}</TD>
                  <TD className="whitespace-nowrap font-medium tabular-nums">{formatMoney(a.amount, a.currency, locale)}</TD>
                  <TD className="hidden text-steel-600 md:table-cell">{a.provider?.name ?? <span className="text-steel-400">{t("notRouted")}</span>}</TD>
                  <TD>
                    <StatusBadge status={a.status} />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(a.submittedAt ?? a.createdAt, locale)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/financing?page=${p}`} className="mt-6" />
        </>
      )}

      {partners.length ? (
        <Card className="mt-6">
          <CardHeader title={t("partners")} description={t("partnersHint")} />
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {partners.map((p) => (
              <div key={p.id} className="rounded-md border border-steel-200 p-4">
                <p className="font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-steel-500">
                  {humanize(p.type)}
                  {p.regulator ? ` · ${p.regulator}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.products.map((pr) => (
                    <Badge key={pr} variant="outline" size="sm">
                      {tf.has(`products.${pr}`) ? tf(`products.${pr}`) : humanize(pr)}
                    </Badge>
                  ))}
                </div>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("indicativeRate")}</dt>
                    <dd className="text-ink-900">{p.indicativeRate ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("amountRange")}</dt>
                    <dd className="tabular-nums text-ink-900">
                      {p.minAmount ? formatMoney(p.minAmount, p.currencies[0] ?? "USD", locale, { compact: true }) : "—"} –{" "}
                      {p.maxAmount ? formatMoney(p.maxAmount, p.currencies[0] ?? "USD", locale, { compact: true }) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-steel-500">{t("tenorRange")}</dt>
                    <dd className="text-ink-900">
                      {p.minTenorDays ?? "—"}–{p.maxTenorDays ?? "—"} d
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
