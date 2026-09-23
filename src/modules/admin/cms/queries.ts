import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { banners, emailTemplates, homepageSections, pages } from "@/db/schema";
import { renderMarkdown } from "@/modules/content/markdown";

export async function listCmsPages() {
  return db.select().from(pages).orderBy(asc(pages.type), asc(pages.sortOrder), asc(pages.slug), asc(pages.locale));
}

export async function getCmsPage(id: string) {
  const [row] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!row) return null;
  return { ...row, html: renderMarkdown(row.content) };
}

export async function listBanners() {
  return db.select().from(banners).orderBy(asc(banners.placement), asc(banners.sortOrder));
}

export async function listHomepageSections() {
  return db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
}

export async function listEmailTemplates() {
  return db.select().from(emailTemplates).orderBy(asc(emailTemplates.code), asc(emailTemplates.locale), desc(emailTemplates.updatedAt));
}
