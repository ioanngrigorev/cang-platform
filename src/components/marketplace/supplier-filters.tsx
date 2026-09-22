import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { employeeRangeLabel, localized } from "@/lib/utils";
import { activeChips, first, list, type SearchParams } from "@/modules/catalog/filters";
import type { IndustryWithCount, ProvinceWithCount } from "@/modules/catalog/queries";
import { ActiveFilters, FilterCheckbox, FilterGroup, FilterInput, FilterSelect } from "./filter-fields";
import { FilterDrawer, FilterForm } from "./filter-form";

export type SupplierFilterOptions = {
  industries?: IndustryWithCount[];
  provinces?: ProvinceWithCount[];
  certifications: Array<{ code: string; name: string }>;
  exportCountries: Array<{ code: string; name: string; nameVi: string; count: number }>;
};

const EMPLOYEE_RANGES = ["R_11_50", "R_51_200", "R_201_500", "R_501_1000", "R_1001_5000"];
const SUPPLIER_FILTER_KEYS = ["q", "industry", "province", "verified", "oem", "odm", "cert", "exports", "minRating", "employees", "maxLead"];

/** Sidebar for manufacturer listings. Industry / province selects are omitted when the page fixes them. */
export async function SupplierFilters({ sp, path, options, hidden }: { sp: SearchParams; path: string; options: SupplierFilterOptions; hidden?: Record<string, string> }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const certByCode = new Map(options.certifications.map((c) => [c.code, c.name]));
  const indBySlug = new Map((options.industries ?? []).map((i) => [i.slug, localized(i as unknown as Record<string, unknown>, "name", locale)]));
  const provBySlug = new Map((options.provinces ?? []).map((p) => [p.slug, localized(p as unknown as Record<string, unknown>, "name", locale)]));
  const countryByCode = new Map(options.exportCountries.map((c) => [c.code, locale === "vi" ? c.nameVi : c.name]));
  const chips = activeChips(
    sp,
    path,
    (key, value) => {
      switch (key) {
        case "q":
          return t("filters.chip.q", { value });
        case "industry":
          return indBySlug.get(value) ?? value;
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
        case "exports":
          return t("filters.chip.exports", { value: countryByCode.get(value) ?? value });
        case "minRating":
          return t("filters.chip.minRating", { value });
        case "employees":
          return t("filters.chip.employees", { value: employeeRangeLabel(value) });
        case "maxLead":
          return t("filters.chip.maxLead", { value });
        default:
          return null;
      }
    },
    SUPPLIER_FILTER_KEYS,
  );
  const selectedCerts = new Set(list(sp.cert));
  const sortValue = first(sp.sort) ?? "relevance";

  return (
    <div className="space-y-4">
      <ActiveFilters chips={chips} clearHref={path} title={t("listing.activeFilters")} clearLabel={t("listing.clearAll")} removeLabel={(label) => t("listing.remove", { label })} />
      <FilterDrawer label={t("listing.showFilters")} closeLabel={t("listing.hideFilters")} count={chips.length}>
        <FilterForm action={`/${locale}${path}`} className="rounded-lg border border-steel-200 bg-white p-4 shadow-card">
          {sortValue !== "relevance" ? <input type="hidden" name="sort" value={sortValue} /> : null}
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <FilterGroup title={t("filters.keyword")}>
            <FilterInput type="search" name="q" defaultValue={first(sp.q) ?? ""} placeholder={t("filters.keywordPlaceholder")} aria-label={t("filters.keyword")} />
          </FilterGroup>
          {options.industries?.length ? (
            <FilterGroup title={t("filters.industry")}>
              <FilterSelect
                name="industry"
                value={first(sp.industry)}
                anyLabel={t("listing.all")}
                ariaLabel={t("filters.industry")}
                options={options.industries.map((i) => ({ value: i.slug, label: localized(i as unknown as Record<string, unknown>, "name", locale), count: i.supplierCount }))}
              />
            </FilterGroup>
          ) : null}
          {options.provinces?.length ? (
            <FilterGroup title={t("filters.province")}>
              <FilterSelect
                name="province"
                value={first(sp.province)}
                anyLabel={t("listing.any")}
                ariaLabel={t("filters.province")}
                options={options.provinces.map((p) => ({ value: p.slug, label: localized(p as unknown as Record<string, unknown>, "name", locale), count: p.supplierCount }))}
              />
            </FilterGroup>
          ) : null}
          <FilterGroup title={t("filters.trust")}>
            <FilterCheckbox name="verified" label={t("filters.verifiedOnly")} checked={first(sp.verified) === "1"} />
            <FilterSelect
              name="minRating"
              value={first(sp.minRating)}
              anyLabel={t("filters.minRating")}
              ariaLabel={t("filters.minRating")}
              options={[4.5, 4, 3.5, 3].map((v) => ({ value: String(v), label: t("filters.ratingAtLeast", { value: v }) }))}
            />
          </FilterGroup>
          <FilterGroup title={t("filters.capabilities")}>
            <FilterCheckbox name="oem" label={t("filters.oem")} checked={first(sp.oem) === "1"} />
            <FilterCheckbox name="odm" label={t("filters.odm")} checked={first(sp.odm) === "1"} />
          </FilterGroup>
          <FilterGroup title={t("filters.exportCountry")}>
            <FilterSelect
              name="exports"
              value={first(sp.exports)}
              anyLabel={t("listing.any")}
              ariaLabel={t("filters.exportCountry")}
              options={options.exportCountries.map((c) => ({ value: c.code, label: locale === "vi" ? c.nameVi : c.name, count: c.count }))}
            />
          </FilterGroup>
          <FilterGroup title={t("filters.employees")}>
            <FilterSelect
              name="employees"
              value={first(sp.employees)}
              anyLabel={t("listing.any")}
              ariaLabel={t("filters.employees")}
              options={EMPLOYEE_RANGES.map((r) => ({ value: r, label: t("filters.employeesLabel", { range: `${employeeRangeLabel(r)}+` }) }))}
            />
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
