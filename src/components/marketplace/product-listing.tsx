import { PackageSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { JsonLd, Pagination } from "@/components/ui/misc";
import { siteUrl } from "@/lib/seo";
import type { SearchParams } from "@/modules/catalog/filters";
import type { ProductHit, SearchResult, SupplierHit } from "@/modules/search";
import { ProductGrid, SupplierGrid } from "./grids";
import { ListingToolbar, pageHref } from "./product-filters";
import { SUPPLIER_SORTS } from "@/modules/catalog/filters";

/** Toolbar + grid + pagination + empty state for a product search result. */
export async function ProductListing({ result, sp, path, locale, columns = 4, itemListName }: { result: SearchResult<ProductHit>; sp: SearchParams; path: string; locale: string; columns?: 3 | 4 | 5; itemListName?: string }) {
  const t = await getTranslations("marketplace");
  return (
    <div className="space-y-5">
      {itemListName && result.hits.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: itemListName,
            numberOfItems: result.total,
            itemListElement: result.hits.map((h, i) => ({ "@type": "ListItem", position: (result.page - 1) * result.pageSize + i + 1, url: `${siteUrl()}/${locale}/product/${h.slug}`, name: h.title })),
          }}
        />
      ) : null}
      <ListingToolbar total={result.total} page={result.page} pageSize={result.pageSize} sp={sp} />
      {result.hits.length ? (
        <ProductGrid products={result.hits} columns={columns} />
      ) : (
        <EmptyState
          icon={<PackageSearch />}
          title={t("products.noResults")}
          description={t("products.noResultsHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href={path} variant="secondary" size="sm">
                {t("listing.clearAll")}
              </Button>
              <Button href="/buyer/rfqs/new" size="sm">
                {t("products.postRfqInstead")}
              </Button>
            </div>
          }
        />
      )}
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={pageHref(path, sp)} />
    </div>
  );
}

export async function SupplierListing({ result, sp, path, locale, columns = 3, itemListName }: { result: SearchResult<SupplierHit>; sp: SearchParams; path: string; locale: string; columns?: 2 | 3 | 4; itemListName?: string }) {
  const t = await getTranslations("marketplace");
  return (
    <div className="space-y-5">
      {itemListName && result.hits.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: itemListName,
            numberOfItems: result.total,
            itemListElement: result.hits.map((h, i) => ({ "@type": "ListItem", position: (result.page - 1) * result.pageSize + i + 1, url: `${siteUrl()}/${locale}/supplier/${h.slug}`, name: h.name })),
          }}
        />
      ) : null}
      <ListingToolbar total={result.total} page={result.page} pageSize={result.pageSize} sp={sp} sorts={SUPPLIER_SORTS} />
      {result.hits.length ? (
        <SupplierGrid suppliers={result.hits} columns={columns} />
      ) : (
        <EmptyState
          icon={<PackageSearch />}
          title={t("manufacturers.noResults")}
          description={t("manufacturers.noResultsHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href={path} variant="secondary" size="sm">
                {t("listing.clearAll")}
              </Button>
              <Button href="/buyer/rfqs/new" size="sm">
                {t("products.postRfqInstead")}
              </Button>
            </div>
          }
        />
      )}
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={pageHref(path, sp)} />
    </div>
  );
}
