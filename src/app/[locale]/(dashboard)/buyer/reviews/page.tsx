import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, PageHeader, RatingStars, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { ordersPendingReview } from "@/modules/orders/queries";
import { listCompanyReviews } from "@/modules/reviews/service";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default async function BuyerReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { locale } = await params;
  const { submitted } = await searchParams;
  const { company } = await requireCompany({ permission: "reviews.write", buyer: true });
  const t = await getTranslations("buyer.reviews");

  const [written, pending] = await Promise.all([listCompanyReviews(company.id), ordersPendingReview(company.id)]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {submitted ? (
        <Alert variant={submitted === "published" ? "success" : "info"} className="mb-6">
          {submitted === "published" ? t("submittedPublished") : t("submittedPending")}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader title={t("pending")} description={t("pendingHint")} action={<Badge variant={pending.length ? "brass" : "neutral"}>{pending.length}</Badge>} />
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="px-5 py-4 text-sm text-steel-500">{t("noPending")}</p>
          ) : (
            <ul className="divide-y divide-steel-100">
              {pending.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{o.supplier.name}</p>
                    <p className="text-xs text-steel-500">
                      {o.orderNumber} · {formatMoney(o.total, o.currency, locale)}
                      {o.completedAt ? ` · ${formatDate(o.completedAt, locale)}` : ""}
                    </p>
                  </div>
                  <Button href={`/buyer/reviews/new?order=${o.id}`} variant="accent" size="sm">
                    <Star /> {t("writeReview")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("written")} />
        <CardContent className="p-0">
          {written.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState icon={<Star />} title={t("noWritten")} description={t("noWrittenHint")} />
            </div>
          ) : (
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>{t("supplier")}</TH>
                  <TH className="hidden sm:table-cell">{t("order")}</TH>
                  <TH>{t("rating")}</TH>
                  <TH className="hidden lg:table-cell">{t("reviewTitle")}</TH>
                  <TH>{t("status")}</TH>
                  <TH className="hidden md:table-cell">{t("date")}</TH>
                </TR>
              </THead>
              <TBody>
                {written.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/supplier/${r.targetCompany.slug}`} className="font-medium text-ink-900 hover:underline">
                        {r.targetCompany.name}
                      </Link>
                      {r.isVerifiedPurchase ? (
                        <Badge variant="success" size="sm" className="ml-2">
                          {t("verifiedPurchase")}
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="hidden sm:table-cell">
                      {r.order ? (
                        <Link href={`/buyer/orders/${r.order.id}`} className="text-steel-600 hover:underline">
                          {r.order.orderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD>
                      <RatingStars value={r.ratingOverall} size={12} />
                    </TD>
                    <TD className="hidden max-w-[260px] truncate text-steel-600 lg:table-cell">{r.title ?? "—"}</TD>
                    <TD>
                      <StatusBadge status={r.status} label={r.status === "PENDING" ? t("moderation") : undefined} />
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 md:table-cell">{formatDate(r.createdAt, locale)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
