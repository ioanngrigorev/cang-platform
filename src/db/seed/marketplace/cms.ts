/**
 * Step 9 — CMS pages (EN + VI) and homepage banners. Pages are upserted by (slug, locale) so this
 * step is safe to re-run even when the marketplace seed itself is skipped.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { banners, pages } from "@/db/schema";
import { BANNERS, PAGES } from "../data/pages";
import type { World } from "./context";

export async function seedCms(db: Db, w: World): Promise<void> {
  let count = 0;
  for (const p of PAGES) {
    for (const locale of ["en", "vi"] as const) {
      const c = p[locale];
      const publishedAt = w.daysAgo(60 + p.sortOrder * 3);
      const coverImageUrl = `https://loremflickr.com/1200/500/vietnam,${p.type === "LEGAL" ? "office,document" : "port,container,factory"}?lock=${700 + p.sortOrder}`;
      await db
        .insert(pages)
        .values({
          slug: p.slug,
          locale,
          type: p.type,
          title: c.title,
          excerpt: c.excerpt,
          content: c.content,
          coverImageUrl,
          status: "PUBLISHED",
          seoTitle: c.seoTitle,
          seoDescription: c.seoDescription,
          sortOrder: p.sortOrder,
          publishedAt,
        })
        .onConflictDoUpdate({
          target: [pages.slug, pages.locale],
          set: { type: p.type, title: c.title, excerpt: c.excerpt, content: c.content, seoTitle: c.seoTitle, seoDescription: c.seoDescription, sortOrder: p.sortOrder, status: "PUBLISHED" },
        });
      count += 1;
    }
  }
  for (const b of BANNERS) {
    const [existing] = await db
      .select({ id: banners.id })
      .from(banners)
      .where(and(eq(banners.placement, b.placement), eq(banners.title, b.title)))
      .limit(1);
    if (existing) continue;
    await db.insert(banners).values({ ...b, isActive: true, startAt: w.daysAgo(30), endAt: w.daysFromNow(180) });
  }
  console.log(`  cms pages: ${count}, banners: ${BANNERS.length}`);
}
