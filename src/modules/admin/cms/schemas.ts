import { z } from "zod";
import { checkbox, idSchema, jsonText, listText, optionalDate, optionalText } from "../shared";

export const PAGE_TYPES = ["PAGE", "GUIDE", "LEGAL", "BLOG", "HELP"] as const;
export const PAGE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const BANNER_PLACEMENTS = ["HOMEPAGE_HERO", "HOMEPAGE_SECONDARY", "CATEGORY", "SEARCH", "RFQ", "SIDEBAR"] as const;
export const LOCALES = ["en", "vi"] as const;

const optionalId = z.string().trim().optional().transform((v) => (v ? v : null));

export const cmsPageSchema = z.object({
  pageId: optionalId,
  slug: z.string().trim().min(2, "Enter a slug").max(120).transform((v) => v.toLowerCase().replace(/[^a-z0-9/-]+/g, "-").replace(/^-+|-+$/g, "")),
  locale: z.enum(LOCALES),
  type: z.enum(PAGE_TYPES),
  title: z.string().trim().min(2, "Enter a title").max(200),
  excerpt: optionalText(500),
  content: z.string().min(1, "Write the page content").max(200000),
  status: z.enum(PAGE_STATUSES),
  coverImageUrl: optionalText(500),
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  sortOrder: z.coerce.number().int().default(0),
});
export const cmsPageStatusSchema = z.object({ pageId: idSchema, status: z.enum(PAGE_STATUSES) });

export const bannerSchema = z.object({
  bannerId: optionalId,
  placement: z.enum(BANNER_PLACEMENTS),
  locale: z.string().trim().optional().transform((v) => (v && (LOCALES as readonly string[]).includes(v) ? v : null)),
  title: z.string().trim().min(2, "Enter a title").max(200),
  subtitle: optionalText(500),
  imageUrl: optionalText(1000),
  imageDocumentId: optionalId,
  ctaLabel: optionalText(80),
  ctaUrl: optionalText(500),
  sortOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
  startAt: optionalDate,
  endAt: optionalDate,
});
export const bannerToggleSchema = z.object({ bannerId: idSchema, isActive: z.enum(["true", "false"]) });

export const homepageSectionSchema = z.object({
  sectionId: optionalId,
  key: z.string().trim().min(2, "Enter a key").max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  title: z.string().trim().min(2, "Enter a title").max(200),
  titleVi: z.string().trim().min(2, "Enter the Vietnamese title").max(200),
  subtitle: optionalText(500),
  subtitleVi: optionalText(500),
  config: jsonText(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});
export const sectionToggleSchema = z.object({ sectionId: idSchema, isActive: z.enum(["true", "false"]) });

export const emailTemplateSchema = z.object({
  templateId: optionalId,
  code: z.string().trim().min(2, "Enter a code").max(80).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  locale: z.enum(LOCALES),
  subject: z.string().trim().min(2, "Enter a subject").max(300),
  bodyHtml: z.string().min(1, "Write the email body").max(200000),
  bodyText: optionalText(20000),
  variables: listText,
  isActive: checkbox,
});
