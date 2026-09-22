import "server-only";
import { and, asc, desc, eq, isNull, lte, or, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { banners, homepageSections, pages } from "@/db/schema";
import { renderMarkdown, stripLeadingH1, withHeadingIds, type TocItem } from "./markdown";

export type PageRow = typeof pages.$inferSelect;
export type PageType = PageRow["type"];

/** A published CMS page in the requested locale, falling back to English when no translation exists. */
export async function getPage(slug: string, locale: string, type?: PageType): Promise<PageRow | null> {
  const conds = [eq(pages.slug, slug), eq(pages.status, "PUBLISHED")];
  if (type) conds.push(eq(pages.type, type));
  const rows = await db.query.pages.findMany({ where: and(...conds), orderBy: [asc(pages.locale)] });
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "en") ?? rows[0] ?? null;
}

export type RenderedPage = PageRow & { html: string; toc: TocItem[]; readingMinutes: number };

export async function getRenderedPage(slug: string, locale: string, type?: PageType): Promise<RenderedPage | null> {
  const page = await getPage(slug, locale, type);
  if (!page) return null;
  const { html, toc } = withHeadingIds(stripLeadingH1(renderMarkdown(page.content)));
  const words = page.content.split(/\s+/).filter(Boolean).length;
  return { ...page, html, toc, readingMinutes: Math.max(1, Math.round(words / 220)) };
}

/** Published pages of a type in one locale (English fallback per slug). */
export async function getPagesByType(type: PageType, locale: string): Promise<PageRow[]> {
  const rows = await db.query.pages.findMany({
    where: and(eq(pages.type, type), eq(pages.status, "PUBLISHED")),
    orderBy: [asc(pages.sortOrder), desc(pages.publishedAt)],
  });
  const bySlug = new Map<string, PageRow>();
  for (const r of rows) {
    const current = bySlug.get(r.slug);
    if (!current || (r.locale === locale && current.locale !== locale)) bySlug.set(r.slug, r);
  }
  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export type HomepageSection = typeof homepageSections.$inferSelect;

export async function getHomepageSections(): Promise<HomepageSection[]> {
  return db.query.homepageSections.findMany({ where: eq(homepageSections.isActive, true), orderBy: [asc(homepageSections.sortOrder)] });
}

export type Banner = typeof banners.$inferSelect;

export async function getActiveBanners(placement: Banner["placement"], locale: string): Promise<Banner[]> {
  const now = new Date();
  return db.query.banners.findMany({
    where: and(
      eq(banners.placement, placement),
      eq(banners.isActive, true),
      or(isNull(banners.locale), eq(banners.locale, locale)),
      or(isNull(banners.startAt), lte(banners.startAt, now)),
      or(isNull(banners.endAt), gte(banners.endAt, now)),
    ),
    orderBy: [asc(banners.sortOrder)],
  });
}

export async function getPublishedPageSlugs(): Promise<Array<{ slug: string; type: PageType; updatedAt: Date }>> {
  const rows = await db
    .select({ slug: pages.slug, type: pages.type, updatedAt: sql<Date>`MAX(${pages.updatedAt})` })
    .from(pages)
    .where(eq(pages.status, "PUBLISHED"))
    .groupBy(pages.slug, pages.type);
  return rows;
}
