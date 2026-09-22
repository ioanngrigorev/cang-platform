import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { getSitemapEntries } from "@/modules/catalog/queries";
import { getPublishedPageSlugs } from "@/modules/content/queries";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/** Static public routes that exist for both locales. */
const STATIC_PATHS: Array<{ path: string; priority: number; changeFrequency: Entry["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/products", priority: 0.9, changeFrequency: "daily" },
  { path: "/manufacturers", priority: 0.9, changeFrequency: "daily" },
  { path: "/clusters", priority: 0.8, changeFrequency: "weekly" },
  { path: "/rfq", priority: 0.8, changeFrequency: "hourly" },
  { path: "/rfq/new", priority: 0.6, changeFrequency: "monthly" },
  { path: "/guides", priority: 0.7, changeFrequency: "weekly" },
  { path: "/why-vietnam", priority: 0.8, changeFrequency: "monthly" },
  { path: "/trade-assurance", priority: 0.8, changeFrequency: "monthly" },
  { path: "/logistics", priority: 0.7, changeFrequency: "monthly" },
  { path: "/financing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/inspection", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
];

/**
 * Both locales of every public URL, each carrying `alternates.languages` so Google can pair them.
 * Search result pages and dashboards are excluded (see robots.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [entries, cmsPages] = await Promise.all([getSitemapEntries(), getPublishedPageSlugs()]);

  const out: MetadataRoute.Sitemap = [];
  const add = (path: string, opts: { lastModified?: Date; priority?: number; changeFrequency?: Entry["changeFrequency"] } = {}) => {
    const languages: Record<string, string> = {};
    for (const l of locales) languages[l] = `${base}/${l}${path === "/" ? "" : path}`;
    languages["x-default"] = languages.en;
    for (const locale of locales) {
      out.push({
        url: `${base}/${locale}${path === "/" ? "" : path}`,
        lastModified: opts.lastModified,
        changeFrequency: opts.changeFrequency ?? "weekly",
        priority: opts.priority ?? 0.5,
        alternates: { languages },
      });
    }
  };

  for (const s of STATIC_PATHS) add(s.path, { priority: s.priority, changeFrequency: s.changeFrequency });

  for (const c of entries.categories) add(`/products/${c.slug}`, { lastModified: c.updatedAt, priority: 0.8, changeFrequency: "daily" });
  for (const p of entries.products) add(`/product/${p.slug}`, { lastModified: p.updatedAt, priority: 0.7, changeFrequency: "weekly" });
  for (const s of entries.suppliers) add(`/supplier/${s.slug}`, { lastModified: s.updatedAt, priority: 0.8, changeFrequency: "weekly" });
  for (const i of entries.industries) add(`/manufacturers/${i.slug}`, { lastModified: i.updatedAt, priority: 0.8, changeFrequency: "weekly" });
  for (const c of entries.combos) add(`/manufacturers/${c.industry}/${c.province}`, { priority: 0.7, changeFrequency: "weekly" });
  for (const c of entries.clusters) add(`/clusters/${c.slug}`, { lastModified: c.updatedAt, priority: 0.7, changeFrequency: "weekly" });

  for (const p of cmsPages) {
    const lastModified = p.updatedAt ? new Date(p.updatedAt) : undefined;
    if (p.type === "GUIDE") add(`/guides/${p.slug}`, { lastModified, priority: 0.6, changeFrequency: "monthly" });
    else if (p.type === "LEGAL") add(`/legal/${p.slug}`, { lastModified, priority: 0.3, changeFrequency: "yearly" });
    // PAGE slugs (about, contact, help, why-vietnam) already have designed routes in STATIC_PATHS.
  }

  return out;
}
