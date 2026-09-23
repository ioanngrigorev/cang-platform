"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { banners, documents, emailTemplates, homepageSections, pages } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { adminActor, revalidateAdmin } from "../context";
import { bannerSchema, bannerToggleSchema, cmsPageSchema, cmsPageStatusSchema, emailTemplateSchema, homepageSectionSchema, sectionToggleSchema } from "./schemas";

const PERMISSION = "admin.cms.write" as const;

function revalidate() {
  revalidateAdmin("/admin/cms");
  // Public pages read the CMS tables directly.
  revalidatePath("/[locale]", "layout");
}

export async function saveCmsPageAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(cmsPageSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(d.pageId ? and(eq(pages.slug, d.slug), eq(pages.locale, d.locale), ne(pages.id, d.pageId)) : and(eq(pages.slug, d.slug), eq(pages.locale, d.locale)))
      .limit(1);
    if (dup) throw new ActionError("A page with this slug already exists for that locale.", "VALIDATION", { slug: ["Slug already used for this locale"] });
    const previous = d.pageId ? (await db.select().from(pages).where(eq(pages.id, d.pageId)).limit(1))[0] : null;
    if (d.pageId && !previous) throw new ActionError("Page not found.", "NOT_FOUND");
    const publishedAt = d.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : previous?.publishedAt ?? null;
    const values = { slug: d.slug, locale: d.locale, type: d.type, title: d.title, excerpt: d.excerpt, content: d.content, status: d.status, coverImageUrl: d.coverImageUrl, seoTitle: d.seoTitle, seoDescription: d.seoDescription, sortOrder: d.sortOrder, publishedAt };
    const [row] = previous ? await db.update(pages).set(values).where(eq(pages.id, previous.id)).returning() : await db.insert(pages).values(values).returning();
    await log({ action: previous ? "admin.cms.page.update" : "admin.cms.page.create", entityType: "page", entityId: row.id, before: previous ? { title: previous.title, status: previous.status, contentLength: previous.content.length } : null, after: { slug: row.slug, locale: row.locale, title: row.title, status: row.status, contentLength: row.content.length } });
    revalidate();
    return ok({ id: row.id }, previous ? "Page saved." : "Page created.");
  });
}

export async function setCmsPageStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(cmsPageStatusSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [before] = await db.select().from(pages).where(eq(pages.id, parsed.data.pageId)).limit(1);
    if (!before) throw new ActionError("Page not found.", "NOT_FOUND");
    await db.update(pages).set({ status: parsed.data.status, publishedAt: parsed.data.status === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt }).where(eq(pages.id, before.id));
    await log({ action: `admin.cms.page.${parsed.data.status.toLowerCase()}`, entityType: "page", entityId: before.id, before: { status: before.status }, after: { status: parsed.data.status, slug: before.slug, locale: before.locale } });
    revalidate();
    return ok(undefined, parsed.data.status === "PUBLISHED" ? "Page published." : parsed.data.status === "DRAFT" ? "Page unpublished." : "Page archived.");
  });
}

export async function saveBannerAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(bannerSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    let imageUrl = d.imageUrl;
    if (d.imageDocumentId) {
      const [doc] = await db.select({ id: documents.id, url: documents.url }).from(documents).where(and(eq(documents.id, d.imageDocumentId), isNull(documents.deletedAt))).limit(1);
      if (!doc) throw new ActionError("Uploaded image not found.", "NOT_FOUND");
      await db.update(documents).set({ visibility: "PUBLIC", type: "PHOTO" }).where(eq(documents.id, doc.id));
      imageUrl = doc.url;
    }
    const previous = d.bannerId ? (await db.select().from(banners).where(eq(banners.id, d.bannerId)).limit(1))[0] : null;
    if (d.bannerId && !previous) throw new ActionError("Banner not found.", "NOT_FOUND");
    const values = { placement: d.placement, locale: d.locale, title: d.title, subtitle: d.subtitle, imageUrl: imageUrl ?? previous?.imageUrl ?? null, ctaLabel: d.ctaLabel, ctaUrl: d.ctaUrl, sortOrder: d.sortOrder, isActive: d.isActive, startAt: d.startAt, endAt: d.endAt };
    const [row] = previous ? await db.update(banners).set(values).where(eq(banners.id, previous.id)).returning() : await db.insert(banners).values(values).returning();
    await log({ action: previous ? "admin.cms.banner.update" : "admin.cms.banner.create", entityType: "banner", entityId: row.id, before: previous ? { title: previous.title, isActive: previous.isActive } : null, after: { title: row.title, placement: row.placement, isActive: row.isActive } });
    revalidate();
    return ok({ id: row.id }, previous ? "Banner saved." : "Banner created.");
  });
}

export async function toggleBannerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(bannerToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(banners).set({ isActive: active }).where(eq(banners.id, parsed.data.bannerId)).returning({ id: banners.id, title: banners.title });
    if (!row) throw new ActionError("Banner not found.", "NOT_FOUND");
    await log({ action: "admin.cms.banner.toggle", entityType: "banner", entityId: row.id, after: { isActive: active } });
    revalidate();
    return ok(undefined, active ? "Banner activated." : "Banner deactivated.");
  });
}

export async function saveHomepageSectionAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(homepageSectionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    if (d.config !== null && (typeof d.config !== "object" || Array.isArray(d.config))) throw new ActionError("Config must be a JSON object.", "VALIDATION", { config: ["Enter a JSON object"] });
    const [dup] = await db
      .select({ id: homepageSections.id })
      .from(homepageSections)
      .where(d.sectionId ? and(eq(homepageSections.key, d.key), ne(homepageSections.id, d.sectionId)) : eq(homepageSections.key, d.key))
      .limit(1);
    if (dup) throw new ActionError("A section with this key already exists.", "VALIDATION", { key: ["Key already in use"] });
    const previous = d.sectionId ? (await db.select().from(homepageSections).where(eq(homepageSections.id, d.sectionId)).limit(1))[0] : null;
    if (d.sectionId && !previous) throw new ActionError("Section not found.", "NOT_FOUND");
    const values = { key: d.key, title: d.title, titleVi: d.titleVi, subtitle: d.subtitle, subtitleVi: d.subtitleVi, config: (d.config ?? previous?.config ?? {}) as Record<string, unknown>, sortOrder: d.sortOrder, isActive: d.isActive };
    const [row] = previous ? await db.update(homepageSections).set(values).where(eq(homepageSections.id, previous.id)).returning() : await db.insert(homepageSections).values(values).returning();
    await log({ action: previous ? "admin.cms.section.update" : "admin.cms.section.create", entityType: "homepage_section", entityId: row.id, before: previous ? { title: previous.title, sortOrder: previous.sortOrder, isActive: previous.isActive, config: previous.config } : null, after: { key: row.key, title: row.title, sortOrder: row.sortOrder, isActive: row.isActive, config: row.config } });
    revalidate();
    return ok({ id: row.id }, previous ? "Section saved." : "Section created.");
  });
}

export async function toggleHomepageSectionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(sectionToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(homepageSections).set({ isActive: active }).where(eq(homepageSections.id, parsed.data.sectionId)).returning({ id: homepageSections.id, key: homepageSections.key });
    if (!row) throw new ActionError("Section not found.", "NOT_FOUND");
    await log({ action: "admin.cms.section.toggle", entityType: "homepage_section", entityId: row.id, after: { key: row.key, isActive: active } });
    revalidate();
    return ok(undefined, active ? "Section shown on the homepage." : "Section hidden.");
  });
}

export async function saveEmailTemplateAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSION);
    const parsed = parseInput(emailTemplateSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(d.templateId ? and(eq(emailTemplates.code, d.code), eq(emailTemplates.locale, d.locale), ne(emailTemplates.id, d.templateId)) : and(eq(emailTemplates.code, d.code), eq(emailTemplates.locale, d.locale)))
      .limit(1);
    if (dup) throw new ActionError("A template with this code already exists for that locale.", "VALIDATION", { code: ["Code already used for this locale"] });
    const previous = d.templateId ? (await db.select().from(emailTemplates).where(eq(emailTemplates.id, d.templateId)).limit(1))[0] : null;
    if (d.templateId && !previous) throw new ActionError("Template not found.", "NOT_FOUND");
    const values = { code: d.code, locale: d.locale, subject: d.subject, bodyHtml: d.bodyHtml, bodyText: d.bodyText, variables: d.variables, isActive: d.isActive };
    const [row] = previous ? await db.update(emailTemplates).set(values).where(eq(emailTemplates.id, previous.id)).returning() : await db.insert(emailTemplates).values(values).returning();
    await log({ action: previous ? "admin.cms.email_template.update" : "admin.cms.email_template.create", entityType: "email_template", entityId: row.id, before: previous ? { subject: previous.subject, isActive: previous.isActive } : null, after: { code: row.code, locale: row.locale, subject: row.subject, isActive: row.isActive } });
    revalidateAdmin("/admin/cms");
    return ok({ id: row.id }, previous ? "Template saved." : "Template created.");
  });
}
