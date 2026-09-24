import { Boxes, ExternalLink, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductRowActions } from "@/components/seller/product-row-actions";
import { Button, EmptyState, Input, LinkTabs, PageHeader, Pagination, SmartImage, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatMoney, formatNumber, localized } from "@/lib/utils";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { listSellerProducts, productTabCounts } from "@/modules/seller/products/queries";
import { PRODUCT_TABS, PRODUCT_UNITS, type ProductListTab } from "@/modules/seller/products/schemas";

export const metadata: Metadata = { title: "Products", robots: { index: false } };

export default async function SellerProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "products.read", seller: true });
  const auth = await getAuth();
  const canWrite = canCompany(auth, "products.write");
  const canPublish = canCompany(auth, "products.publish");
  const t = await getTranslations("seller.products");
  const tf = await getTranslations("seller.productForm");
  const unitLabel = (unit: string) => ((PRODUCT_UNITS as readonly string[]).includes(unit) ? tf(`units.${unit}`) : unit);

  const tab = (PRODUCT_TABS.includes(sp.tab as ProductListTab) ? sp.tab : "all") as ProductListTab;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [{ rows, totalPages, total }, counts] = await Promise.all([listSellerProducts(company.id, { tab, q, page }), productTabCounts(company.id, q)]);
  const hrefFor = (p: number, nextTab = tab) => `/seller/products?tab=${nextTab}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button href="/seller/products/new" variant="primary">
              <Plus /> {t("add")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <LinkTabs current={tab} className="min-w-0 flex-1" tabs={PRODUCT_TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: hrefFor(1, value), count: counts[value] }))} />
        <form method="get" action={`/${locale}/seller/products`} className="flex w-full items-center gap-2 lg:w-80">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-400" />
            <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="pl-9" aria-label={t("search")} />
          </div>
          <Button type="submit" variant="secondary">
            {t("search")}
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title={q ? t("noResults") : t("emptyTitle")}
          description={q ? t("noResultsHint", { q }) : t("emptyDescription")}
          action={
            canWrite && !q ? (
              <Button href="/seller/products/new" variant="primary">
                <Plus /> {t("add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-steel-500">{t("count", { count: total })}</p>
          <Table className="table-fixed">
            <THead>
              <TR>
                <TH>{t("colProduct")}</TH>
                <TH className="hidden w-40 2xl:table-cell">{t("colCategory")}</TH>
                <TH className="w-36">{t("colPrice")}</TH>
                <TH className="hidden w-32 sm:table-cell">{t("colMoq")}</TH>
                <TH className="w-32">{t("colStatus")}</TH>
                <TH className="hidden w-28 lg:table-cell">{t("colViews")}</TH>
                <TH className="hidden w-32 2xl:table-cell">{t("colUpdated")}</TH>
                <TH className="w-36 text-right">{t("colActions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => {
                const image = p.images[0];
                const tiers = p.priceTiers;
                const lowest = tiers.length ? Math.min(...tiers.map((x) => x.price)) : null;
                const highest = tiers.length ? Math.max(...tiers.map((x) => x.price)) : null;
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-steel-200 bg-steel-50">
                          <SmartImage src={image?.url} alt={p.title} fill photo fallbackLabel={p.title} />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/seller/products/${p.id}`} className="line-clamp-2 font-medium text-ink-900 hover:underline">
                            {p.title}
                          </Link>
                          {p.titleVi ? <p className="truncate text-xs text-steel-500">{p.titleVi}</p> : null}
                          <p className="truncate text-xs text-steel-400">
                            <span className="2xl:hidden">{p.category ? localized(p.category, "name", locale) : "—"}</span>
                            {p.status === "ACTIVE" ? (
                              <Link href={`/product/${p.slug}`} target="_blank" className="inline-flex items-center gap-0.5 text-brand-700 hover:underline 2xl:ml-0 ml-2">
                                {t("viewOnMarketplace")} <ExternalLink className="size-3" />
                              </Link>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden text-steel-600 2xl:table-cell">{p.category ? localized(p.category, "name", locale) : "—"}</TD>
                    <TD className="whitespace-nowrap">
                      {p.priceType === "CONTACT" ? (
                        <span className="text-steel-600">{t("priceContact")}</span>
                      ) : p.priceType === "NEGOTIABLE" ? (
                        <span className="text-steel-600">{p.basePrice != null ? `${formatMoney(p.basePrice, p.currency, locale)} · ${t("priceNegotiable")}` : t("priceNegotiable")}</span>
                      ) : lowest != null ? (
                        <>
                          <span className="font-medium tabular-nums">{lowest === highest ? formatMoney(lowest, p.currency, locale) : `${formatMoney(lowest, p.currency, locale)} – ${formatMoney(highest, p.currency, locale)}`}</span>
                          <p className="text-xs text-steel-500">{t("tierCount", { count: tiers.length })}</p>
                        </>
                      ) : p.basePrice != null ? (
                        <span className="font-medium tabular-nums">{formatMoney(p.basePrice, p.currency, locale)}</span>
                      ) : (
                        <span className="text-warning-700">{t("priceMissing")}</span>
                      )}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">
                      {formatNumber(p.moq, locale)} {unitLabel(p.unit)}
                    </TD>
                    <TD>
                      <StatusBadge status={p.status} label={t(`statuses.${p.status}`)} />
                      {p.status === "REJECTED" && p.rejectionReason ? (
                        <p className="mt-1 max-w-[220px] text-xs text-danger-600" title={p.rejectionReason}>
                          {p.rejectionReason}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="hidden whitespace-nowrap tabular-nums text-steel-600 lg:table-cell">
                      {formatNumber(p.viewCount, locale)}
                      <p className="text-xs text-steel-400">{t("inquiries", { count: p.inquiryCount })}</p>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-steel-600 2xl:table-cell">{formatDate(p.updatedAt, locale)}</TD>
                    <TD className="whitespace-nowrap pl-2">
                      <ProductRowActions productId={p.id} status={p.status} canPublish={canPublish} canWrite={canWrite} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor(p)} className="mt-6" />
        </>
      )}
    </>
  );
}
