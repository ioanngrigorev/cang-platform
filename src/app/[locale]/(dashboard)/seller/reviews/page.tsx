import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReviewReplyForm } from "@/components/seller/sales/review-reply-form";
import { Avatar, Badge, Card, CardContent, CardHeader, EmptyState, LinkTabs, PageHeader, Pagination, RatingStars, StatCard, StatusBadge, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { getSupplierReviewSummary } from "@/modules/catalog/queries";
import { RECEIVED_REVIEW_TABS, listReceivedReviews, receivedReviewTabCounts, type ReceivedReviewsTab } from "@/modules/seller/sales/reviews/queries";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

const DIMENSIONS = ["quality", "communication", "delivery", "accuracy", "service"] as const;

export default async function SellerReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "reviews.write", seller: true });
  const t = await getTranslations("sales.reviews");

  const tab = (RECEIVED_REVIEW_TABS.includes(sp.tab as ReceivedReviewsTab) ? sp.tab : "all") as ReceivedReviewsTab;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [summary, { rows, totalPages }, counts] = await Promise.all([getSupplierReviewSummary(company.id), listReceivedReviews(company.id, { tab, page }), receivedReviewTabCounts(company.id)]);
  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <StatCard label={t("average")} value={summary.count ? summary.average.toFixed(1) : "—"} hint={t("averageHint", { count: summary.count })} icon={<Star />} />
        <Card>
          <CardHeader title={t("distribution")} />
          <CardContent className="space-y-1.5">
            {stars.map((s) => {
              const n = summary.distribution[s];
              const pct = summary.count ? Math.round((n / summary.count) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right text-steel-600">{s}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-steel-100">
                    <div className="h-full rounded-full bg-brass-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-steel-500">{n}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("dimensions")} />
          <CardContent className="space-y-1.5">
            {DIMENSIONS.map((d) => {
              const v = summary.dimensions[d];
              return (
                <div key={d} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-steel-600">{t(`dimension.${d}`)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-steel-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((v / 5) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-steel-500">{v ? v.toFixed(1) : "—"}</span>
                </div>
              );
            })}
            <p className="pt-1 text-[11px] text-steel-500">{t("verifiedShare", { pct: Math.round(summary.verifiedShare * 100) })}</p>
          </CardContent>
        </Card>
      </div>

      <LinkTabs current={tab} className="mb-5" tabs={RECEIVED_REVIEW_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/seller/reviews?tab=${value}`, count: counts[value] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={<Star />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <>
          <div className="space-y-4">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar src={r.authorCompany.logoUrl} name={r.authorCompany.name} size={40} square />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                          {r.authorCompany.name} <VerifiedMark status={r.authorCompany.verificationStatus} />
                          {r.isVerifiedPurchase ? (
                            <Badge variant="success" size="sm">
                              {t("verifiedPurchase")}
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-xs text-steel-500">
                          {r.authorCompany.countryCode} · {formatDate(r.publishedAt ?? r.createdAt, locale)}
                          {r.order ? (
                            <>
                              {" · "}
                              <Link href={`/seller/orders/${r.order.id}`} className="hover:underline">
                                {r.order.orderNumber}
                              </Link>
                            </>
                          ) : null}
                          {r.product ? (
                            <>
                              {" · "}
                              <Link href={`/seller/products/${r.product.id}`} className="hover:underline">
                                {localized(r.product, "title", locale)}
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <RatingStars value={r.ratingOverall} size={14} />
                      {r.status === "PENDING" ? <StatusBadge status="PENDING" label={t("awaitingModeration")} size="sm" /> : null}
                    </div>
                  </div>

                  {r.title ? <p className="mt-3 font-medium text-ink-900">{r.title}</p> : null}
                  {r.body ? <p className="mt-1 whitespace-pre-line text-sm text-steel-600">{r.body}</p> : null}

                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel-500">
                    {[
                      ["quality", r.ratingQuality],
                      ["communication", r.ratingCommunication],
                      ["delivery", r.ratingDelivery],
                      ["accuracy", r.ratingAccuracy],
                      ["service", r.ratingService],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex items-center gap-1">
                        <dt>{t(`dimension.${k as string}`)}</dt>
                        <dd className="font-medium text-ink-900">{formatNumber(v as number, locale)}/5</dd>
                      </div>
                    ))}
                  </dl>

                  {r.status === "PUBLISHED" ? (
                    <ReviewReplyForm reviewId={r.id} reply={r.reply} repliedAt={r.repliedAt ? r.repliedAt.toISOString() : null} locale={locale} companyName={company.name} />
                  ) : (
                    <p className="mt-3 text-xs text-steel-500">{t("pendingHint")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/seller/reviews?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
