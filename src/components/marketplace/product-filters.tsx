import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { localized } from "@/lib/utils";
import { activeChips, buildQuery, first, list, PRODUCT_SORTS, type SearchParams } from "@/modules/catalog/filters";
import type { CategoryRow, ProvinceWithCount } from "@/modules/catalog/queries";
import { ActiveFilters, FilterCheckbox, FilterGroup, FilterInput, FilterSelect } from "./filter-fields";
import { FilterDrawer, FilterForm, SortSelect } from "./filter-form";

type Cert = { code: string; name: string };

export type ProductFilterOptions = {
  provinces: ProvinceWithCount[];
  certifications: Cert[];
  /** Sub-categories of the current category (category pages) or root categories (hub). */
  categories?: CategoryRow[];
  categoryParam?: "sub" | "category";
};

const PRODUCT_FILTER_KEYS = ["q", "sub", "category", "province", "minPrice", "maxPrice", "maxMoq", "maxLead", "cert", "verified", "oem", "odm", "sample", "custom"];

/** Sidebar for product listings. `path` is the locale-less pathname the form submits to. */
export async function ProductFilters({ sp, path, options, hidden }: { sp: SearchParams; path: string; options: ProductFilterOptions; hidden?: Record<string, string> }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const catParam = options.categoryParam ?? "sub";
  const certByCode = new Map(options.certifications.map((c) => [c.code, c.name]));
  const provBySlug = new Map(options.provinces.map((p) => [p.slug, localized(p as unknown as Record<string, unknown>, "name", locale)]));
  const catBySlug = new Map((options.categories ?? []).map((c) => [c.slug, localized(c as unknown as Record<string, unknown>, "name", locale)]));
  const chips = activeChips(
    sp,
    path,
    (key, value) => {
      switch (key) {
        case "q":
          return t("filters.chip.q", { value });
        case "sub":
        case "category":
          return catBySlug.get(value) ?? value;
        case "province":
          return provBySlug.get(value) ?? value;
        case "cert":
          return certByCode.get(value) ?? value;
        case "verified":
          return t("filters.chip.verified");
        case "oem":
          return t("filters.chip.oem");
        case "odm":
          return t("filters.chip.odm");
        case "sample":
          return t("filters.chip.sample");
        case "custom":
          return t("filters.chip.custom");
        case "minPrice":
          return t("filters.chip.minPrice", { value });
        case "maxPrice":
          return t("filters.chip.maxPrice", { value });
        case "maxMoq":
          return t("filters.chip.maxMoq", { value });
        case "maxLead":
          return t("filters.chip.maxLead", { value });
        default:
          return null;
      }
    },
    PRODUCT_FILTER_KEYS,
  );
  const selectedCerts = new Set(list(sp.cert));
  const sortValue = first(sp.sort) ?? "relevance";

  return (
    <div className="space-y-4">
      <ActiveFilters chips={chips} clearHref={path} title={t("listing.activeFilters")} clearLabel={t("listing.clearAll")} removeLabel={(label) => t("listing.remove", { label })} />
      <FilterDrawer label={t("listing.showFilters")} closeLabel={t("listing.hideFilters")} count={chips.length}>
        <FilterForm action={`/${locale}${path}`} className="rounded-xl bg-surface p-1 pr-4">
          {sortValue !== "relevance" ? <input type="hidden" name="sort" value={sortValue} /> : null}
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <FilterGroup title={t("filters.keyword")}>
            <FilterInput type="search" name="q" defaultValue={first(sp.q) ?? ""} placeholder={t("filters.keywordPlaceholder")} aria-label={t("filters.keyword")} />
          </FilterGroup>
          {options.categories?.length ? (
            <FilterGroup title={catParam === "sub" ? t("filters.subcategory") : t("filters.category")}>
              <FilterSelect
                name={catParam}
                value={first(sp[catParam])}
                anyLabel={t("listing.all")}
                ariaLabel={catParam === "sub" ? t("filters.subcategory") : t("filters.category")}
                options={options.categories.map((c) => ({ value: c.slug, label: localized(c as unknown as Record<string, unknown>, "name", locale), count: c.productCount || undefined }))}
              />
            </FilterGroup>
          ) : null}
          <FilterGroup title={t("filters.province")}>
            <FilterSelect
              name="province"
              value={first(sp.province)}
              anyLabel={t("listing.any")}
              ariaLabel={t("filters.province")}
              options={options.provinces.map((p) => ({ value: p.slug, label: localized(p as unknown as Record<string, unknown>, "name", locale), count: p.supplierCount }))}
            />
          </FilterGroup>
          <FilterGroup title={t("filters.priceRange")}>
            <div className="grid grid-cols-2 gap-2">
              <FilterInput type="number" name="minPrice" min={0} step="0.01" inputMode="decimal" defaultValue={first(sp.minPrice) ?? ""} placeholder={t("filters.min")} aria-label={t("filters.min")} />
              <FilterInput type="number" name="maxPrice" min={0} step="0.01" inputMode="decimal" defaultValue={first(sp.maxPrice) ?? ""} placeholder={t("filters.max")} aria-label={t("filters.max")} />
            </div>
          </FilterGroup>
          <FilterGroup title={t("filters.maxMoq")}>
            <FilterInput type="number" name="maxMoq" min={1} inputMode="numeric" defaultValue={first(sp.maxMoq) ?? ""} placeholder={t("filters.maxMoqPlaceholder")} aria-label={t("filters.maxMoq")} />
          </FilterGroup>
          <FilterGroup title={t("filters.maxLead")}>
            <FilterSelect
              name="maxLead"
              value={first(sp.maxLead)}
              anyLabel={t("listing.any")}
              ariaLabel={t("filters.maxLead")}
              options={[15, 30, 45, 60, 90].map((d) => ({ value: String(d), label: t("filters.days", { count: d }) }))}
            />
          </FilterGroup>
          <FilterGroup title={t("filters.capabilities")}>
            <FilterCheckbox name="oem" label={t("filters.oem")} checked={first(sp.oem) === "1"} />
            <FilterCheckbox name="odm" label={t("filters.odm")} checked={first(sp.odm) === "1"} />
            <FilterCheckbox name="sample" label={t("filters.sample")} checked={first(sp.sample) === "1"} />
            <FilterCheckbox name="custom" label={t("filters.customizable")} checked={first(sp.custom) === "1"} />
          </FilterGroup>
          <FilterGroup title={t("filters.trust")}>
            <FilterCheckbox name="verified" label={t("filters.verifiedOnly")} checked={first(sp.verified) === "1"} />
          </FilterGroup>
          <FilterGroup title={t("filters.certifications")}>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {options.certifications.map((c) => (
                <FilterCheckbox key={c.code} name="cert" value={c.code} label={c.name} checked={selectedCerts.has(c.code)} />
              ))}
            </div>
          </FilterGroup>
          <div className="pt-4">
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              {t("listing.apply")}
            </Button>
          </div>
        </FilterForm>
      </FilterDrawer>
    </div>
  );
}

/** Results count + sort control shown above a listing grid. */
export async function ListingToolbar({ total, page, pageSize, sp, sorts = PRODUCT_SORTS, children }: { total: number; page: number; pageSize: number; sp: SearchParams; sorts?: readonly string[]; children?: React.ReactNode }) {
  const t = await getTranslations("marketplace");
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-steel-600">
        <span className="font-semibold text-ink-900">{t("listing.results", { count: total })}</span>
        {total > 0 ? <span className="ml-2 hidden sm:inline">· {t("listing.showing", { from, to, total })}</span> : null}
      </p>
      <div className="flex items-center gap-2">
        {children}
        <SortSelect label={t("listing.sortBy")} value={first(sp.sort) ?? "relevance"} options={sorts.map((s) => ({ value: s, label: t(`filters.sort.${s}`) }))} />
      </div>
    </div>
  );
}

export function pageHref(path: string, sp: SearchParams) {
  return (page: number) => `${path}${buildQuery(sp, { page: page > 1 ? page : null })}`;
}
