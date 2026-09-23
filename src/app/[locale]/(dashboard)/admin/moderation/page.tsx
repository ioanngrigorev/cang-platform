import { Gavel } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReviewModerationButtons } from "@/components/admin/moderation-actions";
import { RiskFlagTable } from "@/components/admin/risk-flag-table";
import { Badge, EmptyState, LinkTabs, PageHeader, Pagination, RatingStars, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { timeAgo } from "@/lib/utils";
import { REVIEW_TABS, listAdminReviews, reviewTabCounts, type ReviewTab } from "@/modules/admin/moderation/queries";
import { listRiskFlags, riskFlagCounts } from "@/modules/admin/risk/queries";
import { pageParam, qs, str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default async function AdminModerationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.reviews.moderate");
  const t = await getTranslations("admin.moderation");
  const tc = await getTranslations("admin.common");
  const view = str(sp.tab) === "flags" ? "flags" : "reviews";
  const sub = (REVIEW_TABS.includes(str(sp.status) as ReviewTab) ? str(sp.status) : "queue") as ReviewTab;
  const page = pageParam(sp.page);
  const canModerate = canPlatform(auth, "admin.reviews.moderate");
  const canRisk = canPlatform(auth, "admin.compliance.review");

  const [reviewCounts, flagCounts] = await Promise.all([reviewTabCounts(), riskFlagCounts()]);
  const topTabs = [
    { value: "reviews", label: t("tabReviews"), href: "/admin/moderation?tab=reviews", count: reviewCounts.queue },
    { value: "flags", label: t("tabFlags"), href: "/admin/moderation?tab=flags", count: flagCounts.OPEN + flagCounts.INVESTIGATING },
  ];

  if (view === "flags") {
    const { rows, page: p, totalPages } = await listRiskFlags({ open: true, page });
    return (
      <div className="max-w-none">
        <PageHeader title={t("title")} description={t("description")} />
        <LinkTabs current={view} className="mb-5" tabs={topTabs} />
        <RiskFlagTable rows={rows} locale={locale} canWrite={canRisk} />
        <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/moderation", { tab: "flags", page: n })} className="mt-6" />
        <p className="mt-4 text-xs text-steel-500">
          <Link href="/admin/risk" className="text-brand-700 hover:underline">
            {t("allFlags")}
          </Link>
        </p>
      </div>
    );
  }

  const { rows, page: p, totalPages } = await listAdminReviews({ tab: sub, page });
  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      <LinkTabs current={view} className="mb-4" tabs={topTabs} />
      <LinkTabs current={sub} className="mb-5" tabs={REVIEW_TABS.map((value) => ({ value, label: t(`reviewTabs.${value}`), href: qs("/admin/moderation", { tab: "reviews", status: value }), count: reviewCounts[value] }))} />
      {rows.length === 0 ? (
        <EmptyState icon={<Gavel />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>{t("colReview")}</TH>
                <TH>{t("colAuthor")}</TH>
                <TH>{t("colTarget")}</TH>
                <TH className="text-right">{t("colFraud")}</TH>
                <TH>{tc("status")}</TH>
                <TH className="hidden md:table-cell">{t("colCreated")}</TH>
                <TH className="text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[360px]">
                    <RatingStars value={r.ratingOverall} size={12} />
                    <p className="truncate font-medium text-ink-900">{r.title ?? "—"}</p>
                    {r.body ? <p className="line-clamp-2 text-xs text-steel-600">{r.body}</p> : null}
                    <p className="text-[11px] text-steel-500">
                      {r.order ? `${r.order.orderNumber} · ` : ""}
                      {r.isVerifiedPurchase ? t("verifiedPurchase") : t("unverified")}
                      {r.moderationNote ? ` · ${r.moderationNote}` : ""}
                    </p>
                  </TD>
                  <TD className="text-xs">
                    <Link href={`/admin/companies/${r.authorCompany.id}`} className="hover:underline">
                      {r.authorCompany.name}
                    </Link>
                    <span className="block text-steel-500">{r.author.name}</span>
                  </TD>
                  <TD className="text-xs">
                    <Link href={`/admin/companies/${r.targetCompany.id}`} className="hover:underline">
                      {r.targetCompany.name}
                    </Link>
                  </TD>
                  <TD className="text-right">
                    <Badge size="sm" variant={r.fraudScore >= 60 ? "danger" : r.fraudScore >= 30 ? "warning" : "neutral"}>
                      {r.fraudScore}
                    </Badge>
                    {r.fraudSignals && Array.isArray(r.fraudSignals) && r.fraudSignals.length ? <p className="mt-0.5 text-[10px] text-steel-500">{(r.fraudSignals as string[]).join(", ")}</p> : null}
                  </TD>
                  <TD>
                    <StatusBadge status={r.status} size="sm" />
                  </TD>
                  <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{timeAgo(r.createdAt, locale)}</TD>
                  <TD className="text-right">
                    <ReviewModerationButtons reviewId={r.id} status={r.status} canModerate={canModerate} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={p} totalPages={totalPages} hrefFor={(n) => qs("/admin/moderation", { tab: "reviews", status: sub, page: n })} className="mt-6" />
        </>
      )}
    </div>
  );
}
