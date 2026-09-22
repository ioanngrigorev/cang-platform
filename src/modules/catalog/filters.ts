import type { ProductSearchFilters, SortOption, SupplierSearchFilters } from "@/modules/search/types";

/**
 * URL query-string ⇄ search filter mapping for the public listings.
 * Pure functions (no server-only import) so both server pages and client filter forms can use them.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export const PRODUCT_SORTS: SortOption[] = ["relevance", "newest", "price_asc", "price_desc", "moq_asc", "rating", "popular"];
export const SUPPLIER_SORTS: SortOption[] = ["relevance", "rating", "newest", "popular"];

export function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v === "" ? undefined : v;
}

export function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : v.split(",");
  return arr.map((s) => s.trim()).filter(Boolean);
}

function num(v: string | string[] | undefined): number | undefined {
  const s = first(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function bool(v: string | string[] | undefined): boolean {
  const s = first(v);
  return s === "1" || s === "true" || s === "on";
}

function sort<T extends SortOption>(v: string | string[] | undefined, allowed: T[]): T | undefined {
  const s = first(v) as T | undefined;
  return s && allowed.includes(s) ? s : undefined;
}

export function parseProductFilters(sp: SearchParams, fixed: Partial<ProductSearchFilters> = {}): ProductSearchFilters {
  const sub = first(sp.sub);
  return {
    q: first(sp.q),
    categorySlug: sub ?? fixed.categorySlug,
    provinceSlug: first(sp.province),
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    maxMoq: num(sp.maxMoq),
    maxLeadTimeDays: num(sp.maxLead),
    certifications: list(sp.cert),
    verifiedOnly: bool(sp.verified),
    oem: bool(sp.oem),
    odm: bool(sp.odm),
    hasSample: bool(sp.sample),
    customizable: bool(sp.custom),
    sort: sort(sp.sort, PRODUCT_SORTS) ?? (first(sp.q) ? "relevance" : undefined),
    page: Math.max(1, num(sp.page) ?? 1),
    pageSize: 24,
    ...stripUndefined(fixed),
  };
}

export function parseSupplierFilters(sp: SearchParams, fixed: Partial<SupplierSearchFilters> = {}): SupplierSearchFilters {
  return {
    q: first(sp.q),
    industrySlug: first(sp.industry),
    provinceSlug: first(sp.province),
    verifiedOnly: bool(sp.verified),
    oem: bool(sp.oem),
    odm: bool(sp.odm),
    certifications: list(sp.cert),
    exportCountry: first(sp.exports),
    minRating: num(sp.minRating),
    minEmployees: first(sp.employees),
    maxLeadTimeDays: num(sp.maxLead),
    sort: sort(sp.sort, SUPPLIER_SORTS),
    page: Math.max(1, num(sp.page) ?? 1),
    pageSize: 24,
    ...stripUndefined(fixed),
  };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Build a query string from the current params with overrides; `null` removes a key, page resets unless given. */
export function buildQuery(sp: SearchParams, overrides: Record<string, string | string[] | number | null | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || k === "page") continue;
    if (Array.isArray(v)) v.forEach((x) => x && params.append(k, x));
    else if (v !== "") params.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    params.delete(k);
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
    else params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Active filter chips: [{ key, value, label }] — value removal handled by buildQuery(sp, { key: null }) or list minus one. */
export type ActiveChip = { key: string; value: string; label: string; href: string };

export function activeChips(
  sp: SearchParams,
  path: string,
  labelFor: (key: string, value: string) => string | null,
  keys: string[],
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const key of keys) {
    const raw = sp[key];
    if (raw === undefined || raw === "") continue;
    const values = list(raw);
    for (const value of values) {
      const label = labelFor(key, value);
      if (!label) continue;
      const remaining = values.filter((v) => v !== value);
      chips.push({ key, value, label, href: `${path}${buildQuery(sp, { [key]: remaining.length ? remaining : null })}` });
    }
  }
  return chips;
}
