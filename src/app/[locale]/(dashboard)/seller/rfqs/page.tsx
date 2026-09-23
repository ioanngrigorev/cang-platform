import { FileText, Search, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Badge, Button, EmptyState, Input, LinkTabs, PageHeader, Pagination, Select, TBody, TD, TH, THead, TR, Table, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { categoryOptions } from "@/modules/rfq/service";
import { SELLER_RFQ_TABS, listSellerRfqs, rfqDestinationOptions, sellerRfqTabCounts, type SellerRfqTab } from "@/modules/seller/sales/rfqs";

export const metadata: Metadata = { title: "RFQ marketplace", robots: { index: false } };

export default async function SellerRfqsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string; category?: string; destination?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "rfq.read", seller: true });
  const t = await getTranslations("sales.rfqs");

  const tab = (SELLER_RFQ_TABS.includes(sp.tab as SellerRfqTab) ? sp.tab : "matched") as SellerRfqTab;
  const categoryId = (sp.category ?? "").trim();
  const destination = (sp.destination ?? "").trim().toUpperCase();
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const filters = { categoryId: categoryId || undefined, destination: destination || undefined, q: q || undefined };
  const [{ rows, totalPages, total }, counts, categories, destinations] = await Promise.all([
    listSellerRfqs(company.id, { tab, page, ...filters }),
    sellerRfqTabCounts(company.id, filters),
    categoryOptions(),
    rfqDestinationOptions(),
  ]);
  const hasFilters = !!(categoryId || destination || q);
  const query = (p: number, nextTab = tab) => {
    const usp = new URLSearchParams();
    usp.set("tab", nextTab);
    if (categoryId) usp.set("category", categoryId);
    if (destination) usp.set("destination", destination);
    if (q) usp.set("q", q);
    if (p > 1) usp.set("page", String(p));
    return `/seller/rfqs?${usp.toString()}`;
  };
  const deadlineOf = (r: { quoteDeadline: Date | null; expiresAt: Date | null }) => r.quoteDeadline ?? r.expiresAt;
  const soon = (d: Date | null) => !!d && d.getTime() - Date.now() < 3 * 86400000;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <LinkTabs current={tab} className="mb-4" tabs={SELLER_RFQ_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: query(1, value), count: counts[value] }))} />

      <form method="get" action={`/${locale}/seller/rfqs`} className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_200px_180px_auto]">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-400" />
          <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="pl-9" aria-label={t("search")} />
        </div>
        <Select name="category" defaultValue={categoryId} aria-label={t("filterCategory")}>
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {`${"  ".repeat(c.level)}${localized(c, "name", locale)}`}
            </option>
          ))}
        </Select>
        <Select name="destination" defaultValue={destination} aria-label={t("filterDestination")}>
          <option value="">{t("allDestinations")}</option>
          {destinations.map((c) => (
            <option key={c.code} value={c.code}>
              {localized(c, "name", locale)}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary">
            {t("search")}
          </Button>
          {hasFilters ? (
            <Button href={`/seller/rfqs?tab=${tab}`} variant="ghost">
              {t("clear")}
            </Button>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={tab === "matched" ? <Sparkles /> : <FileText />}
          title={hasFilters ? t("noResults") : t(`empty.${tab}`)}
          description={hasFilters ? t("noResultsHint") : t(`emptyHint.${tab}`)}
          action={
            hasFilters ? (
              <Button href={`/seller/rfqs?tab=${tab}`} variant="secondary">
                {t("clear")}
              </Button>
            ) : tab === "matched" ? (
              <Button href="/seller/rfqs?tab=all" variant="primary">
                {t("browseAll")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-steel-500">{t("count", { count: total })}</p>
          <Table>
            <THead>
              <TR>
                <TH>{t("colRfq")}</TH>
                <TH className="hidden md:table-cell">{t("colBuyer")}</TH>
                <TH>{t("colQuantity")}</TH>
                <TH className="hidden lg:table-cell">{t("colTarget")}</TH>
                <TH className="hidden xl:table-cell">{t("colDelivery")}</TH>
                <TH className="hidden sm:table-cell">{t("colDeadline")}</TH>
                <TH className="hidden lg:table-cell">{t("colQuotes")}</TH>
                <TH>{t("colYou")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const deadline = deadlineOf(r);
                return (
                  <TR key={r.id}>
                    <TD className="max-w-[360px]">
                      <Link href={`/seller/rfqs/${r.id}`} className="line-clamp-2 font-medium text-ink-900 hover:underline">
                        {r.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-steel-500">
                        {r.rfqNumber}
                        {r.category ? ` · ${localized(r.category, "name", locale)}` : ""}
                        {r.isPriority ? (
                          <Badge variant="brass" size="sm" className="ml-2">
                            {t("priority")}
                          </Badge>
                        ) : null}
                      </p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-ink-900">
                        {r.buyer.name}
                        <VerifiedMark status={r.buyer.verificationStatus} />
                      </span>
                      <p className="text-xs text-steel-500">{r.buyer.countryCode}</p>
                    </TD>
                    <TD className="whitespace-nowrap text-steel-600">
                      {formatNumber(r.quantity, locale)} {r.unit}
                    </TD>
                    <TD className="hidden whitespace-nowrap tabular-nums text-steel-600 lg:table-cell">{r.targetPrice ? formatMoney(r.targetPrice, r.targetCurrency, locale, { maxFractionDigits: 4 }) : "—"}</TD>
                    <TD className="hidden text-steel-600 xl:table-cell">
                      {[r.incoterm, r.destinationCity, r.destinationCountry ? localized(r.destinationCountry, "name", locale) : r.destinationCountryCode].filter(Boolean).join(" · ") || "—"}
                    </TD>
                    <TD className="hidden whitespace-nowrap sm:table-cell">
                      {deadline ? <span className={soon(deadline) ? "font-medium text-warning-700" : "text-steel-600"}>{formatDate(deadline, locale)}</span> : <span className="text-steel-400">—</span>}
                    </TD>
                    <TD className="hidden tabular-nums text-steel-600 lg:table-cell">{formatNumber(r.quotationCount, locale)}</TD>
                    <TD>
                      <span className="flex flex-wrap gap-1">
                        {r.myQuotationStatus === "DRAFT" ? (
                          <Badge variant="neutral" size="sm">
                            {t("badgeDraft")}
                          </Badge>
                        ) : r.myQuotationStatus && r.myQuotationStatus !== "WITHDRAWN" ? (
                          <Badge variant={r.myQuotationStatus === "ACCEPTED" ? "success" : r.myQuotationStatus === "REJECTED" || r.myQuotationStatus === "EXPIRED" ? "danger" : "info"} size="sm">
                            {r.myQuotationStatus === "ACCEPTED" ? t("badgeAwarded") : r.myQuotationStatus === "REJECTED" ? t("badgeRejected") : t("badgeQuoted")}
                          </Badge>
                        ) : null}
                        {r.invitationStatus && r.invitationStatus !== "QUOTED" ? (
                          <Badge variant={r.invitationStatus === "DECLINED" ? "neutral" : "brass"} size="sm">
                            {r.invitationStatus === "DECLINED" ? t("badgeDeclined") : t("badgeInvited")}
                          </Badge>
                        ) : null}
                        {!r.myQuotationStatus && !r.invitationStatus && r.status !== "OPEN" ? (
                          <Badge variant="neutral" size="sm">
                            {t(`rfqStatus.${r.status}`)}
                          </Badge>
                        ) : null}
                      </span>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => query(p)} className="mt-6" />
        </>
      )}
    </>
  );
}
