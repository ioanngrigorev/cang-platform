import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildQuery, first, type SearchParams } from "@/modules/catalog/filters";
import { ChipLink } from "./filter-fields";

export type RfqFacets = {
  categories: Array<{ slug: string; name: string; nameVi: string; count: number }>;
  destinations: Array<{ code: string; name: string; nameVi: string; count: number }>;
};

/** Chip-row filters for the public RFQ marketplace (category + destination). Pure links, no JS needed. */
export async function RfqFilters({ sp, path, facets, total }: { sp: SearchParams; path: string; facets: RfqFacets; total: number }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const activeCategory = first(sp.category);
  const activeDestination = first(sp.destination);
  const label = (row: { name: string; nameVi: string }) => (locale === "vi" && row.nameVi ? row.nameVi : row.name);
  const hasFilters = Boolean(activeCategory || activeDestination);

  return (
    <div className="space-y-4 rounded-lg border border-steel-200 bg-white p-4 shadow-card">
      <div>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("rfq.filterCategory")}</h2>
        <div className="flex flex-wrap gap-2">
          <ChipLink href={`${path}${buildQuery(sp, { category: null })}`} active={!activeCategory} count={total}>
            {t("rfq.all")}
          </ChipLink>
          {facets.categories.map((c) => (
            <ChipLink key={c.slug} href={`${path}${buildQuery(sp, { category: c.slug })}`} active={activeCategory === c.slug} count={c.count}>
              {label(c)}
            </ChipLink>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("rfq.filterDestination")}</h2>
        <div className="flex flex-wrap gap-2">
          <ChipLink href={`${path}${buildQuery(sp, { destination: null })}`} active={!activeDestination}>
            {t("rfq.all")}
          </ChipLink>
          {facets.destinations.map((d) => (
            <ChipLink key={d.code} href={`${path}${buildQuery(sp, { destination: d.code })}`} active={activeDestination === d.code} count={d.count}>
              {label(d)}
            </ChipLink>
          ))}
        </div>
      </div>
      {hasFilters ? (
        <Button href={path} variant="ghost" size="sm">
          {t("listing.clearAll")}
        </Button>
      ) : null}
    </div>
  );
}
