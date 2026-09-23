import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BannerDialog, BannerToggle, CmsPageDialog, CmsPageStatusButtons, EmailTemplateDialog, HomepageSectionDialog, SectionToggle } from "@/components/admin/cms-forms";
import { JsonDetails } from "@/components/admin/json-details";
import { Badge, LinkTabs, PageHeader, SmartImage, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { listBanners, listCmsPages, listEmailTemplates, listHomepageSections } from "@/modules/admin/cms/queries";
import { str } from "@/modules/admin/shared";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";
import { renderMarkdown, sanitizeHtml } from "@/modules/content/markdown";

export const metadata: Metadata = { title: "CMS", robots: { index: false } };

const TABS = ["pages", "banners", "sections", "emails"] as const;
type Tab = (typeof TABS)[number];

const publicPath = (type: string, slug: string) => (type === "LEGAL" ? `/legal/${slug}` : type === "GUIDE" ? `/guides/${slug}` : type === "HELP" ? `/help/${slug}` : type === "BLOG" ? `/blog/${slug}` : `/${slug}`);

export default async function AdminCmsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const auth = await requireAdmin("admin.cms.write");
  const t = await getTranslations("admin.cms");
  const tc = await getTranslations("admin.common");
  const tab = (TABS.includes(str(sp.tab) as Tab) ? str(sp.tab) : "pages") as Tab;
  const canWrite = canPlatform(auth, "admin.cms.write");
  const [pages, banners, sections, templates] = await Promise.all([listCmsPages(), listBanners(), listHomepageSections(), listEmailTemplates()]);
  const counts: Record<Tab, number> = { pages: pages.length, banners: banners.length, sections: sections.length, emails: templates.length };
  const dateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  const action = !canWrite ? null : tab === "pages" ? <CmsPageDialog /> : tab === "banners" ? <BannerDialog /> : tab === "sections" ? <HomepageSectionDialog /> : <EmailTemplateDialog />;

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} actions={action} />
      <LinkTabs current={tab} className="mb-5" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: `/admin/cms?tab=${value}`, count: counts[value] }))} />

      {tab === "pages" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colPage")}</TH>
              <TH>{t("type")}</TH>
              <TH>{t("locale")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="hidden md:table-cell">{t("colUpdated")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {pages.map((p) => (
              <TR key={p.id}>
                <TD className="max-w-[420px]">
                  <span className="font-medium text-ink-900">{p.title}</span>
                  <span className="block text-xs text-steel-500">
                    /{p.slug}
                    {p.excerpt ? ` · ${p.excerpt.slice(0, 80)}` : ""}
                  </span>
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-ink-700 hover:text-ink-900">{t("preview")}</summary>
                    <div className="prose prose-sm mt-2 max-h-72 max-w-none overflow-auto rounded-md border border-hairline bg-steel-50 p-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
                  </details>
                </TD>
                <TD className="text-xs">{p.type}</TD>
                <TD className="text-xs uppercase">{p.locale}</TD>
                <TD>
                  <StatusBadge status={p.status} size="sm" />
                  {p.status === "PUBLISHED" ? (
                    <Link href={publicPath(p.type, p.slug)} locale={p.locale as "en" | "vi"} className="ml-2 inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline">
                      <ExternalLink className="size-3" /> {t("view")}
                    </Link>
                  ) : null}
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">{formatDateTime(p.updatedAt, locale)}</TD>
                <TD className="text-right">
                  {canWrite ? (
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      <CmsPageDialog values={{ id: p.id, slug: p.slug, locale: p.locale, type: p.type, title: p.title, excerpt: p.excerpt, content: p.content, status: p.status, coverImageUrl: p.coverImageUrl, seoTitle: p.seoTitle, seoDescription: p.seoDescription, sortOrder: p.sortOrder }} />
                      <CmsPageStatusButtons pageId={p.id} status={p.status} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "banners" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colBanner")}</TH>
              <TH>{t("placement")}</TH>
              <TH className="hidden md:table-cell">{t("schedule")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {banners.map((b) => (
              <TR key={b.id}>
                <TD>
                  <span className="flex items-start gap-3">
                    <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-steel-100">{b.imageUrl ? <SmartImage src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" /> : null}</span>
                    <span className="min-w-0">
                      <span className="block font-medium text-ink-900">{b.title}</span>
                      <span className="block text-xs text-steel-500">
                        {b.subtitle ?? ""}
                        {b.ctaUrl ? ` · ${b.ctaLabel ?? b.ctaUrl}` : ""}
                      </span>
                    </span>
                  </span>
                </TD>
                <TD className="text-xs">
                  {b.placement.replace(/_/g, " ").toLowerCase()}
                  <span className="block text-steel-500">{b.locale ? b.locale.toUpperCase() : t("allLocales")}</span>
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">
                  {b.startAt ? formatDate(b.startAt, locale) : "…"} → {b.endAt ? formatDate(b.endAt, locale) : "…"}
                </TD>
                <TD>
                  <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {canWrite ? (
                    <span className="inline-flex gap-1">
                      <BannerDialog values={{ id: b.id, placement: b.placement, locale: b.locale, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, sortOrder: b.sortOrder, isActive: b.isActive, startAt: dateStr(b.startAt), endAt: dateStr(b.endAt) }} />
                      <BannerToggle bannerId={b.id} isActive={b.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "sections" ? (
        <Table>
          <THead>
            <TR>
              <TH className="w-12">#</TH>
              <TH>{t("colSection")}</TH>
              <TH className="hidden md:table-cell">{t("config")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {sections.map((s) => (
              <TR key={s.id}>
                <TD className="tabular-nums text-steel-500">{s.sortOrder}</TD>
                <TD>
                  <span className="font-medium text-ink-900">{s.title}</span>
                  <span className="block text-xs text-steel-500">
                    {s.titleVi} · <code>{s.key}</code>
                  </span>
                </TD>
                <TD className="hidden md:table-cell">
                  <JsonDetails summary={t("config")} value={s.config} />
                </TD>
                <TD>
                  <StatusBadge status={s.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">
                  {canWrite ? (
                    <span className="inline-flex gap-1">
                      <HomepageSectionDialog values={{ id: s.id, key: s.key, title: s.title, titleVi: s.titleVi, subtitle: s.subtitle, subtitleVi: s.subtitleVi, config: s.config, sortOrder: s.sortOrder, isActive: s.isActive }} />
                      <SectionToggle sectionId={s.id} isActive={s.isActive} />
                    </span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}

      {tab === "emails" ? (
        <Table>
          <THead>
            <TR>
              <TH>{t("colTemplate")}</TH>
              <TH>{t("locale")}</TH>
              <TH className="hidden md:table-cell">{t("variables")}</TH>
              <TH>{tc("status")}</TH>
              <TH className="text-right">{tc("actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {templates.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-steel-500">
                  {t("noTemplates")}
                </TD>
              </TR>
            ) : null}
            {templates.map((e) => (
              <TR key={e.id}>
                <TD className="max-w-[420px]">
                  <span className="font-medium text-ink-900">{e.subject}</span>
                  <span className="block text-xs text-steel-500">
                    <code>{e.code}</code>
                  </span>
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-ink-700 hover:text-ink-900">{t("preview")}</summary>
                    <div className="mt-2 max-h-72 overflow-auto rounded-md border border-hairline bg-steel-50 p-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(e.bodyHtml) }} />
                  </details>
                </TD>
                <TD className="text-xs uppercase">{e.locale}</TD>
                <TD className="hidden text-xs md:table-cell">
                  {e.variables.map((v) => (
                    <Badge key={v} size="sm" className="mr-1">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </TD>
                <TD>
                  <StatusBadge status={e.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </TD>
                <TD className="text-right">{canWrite ? <EmailTemplateDialog values={{ id: e.id, code: e.code, locale: e.locale, subject: e.subject, bodyHtml: e.bodyHtml, bodyText: e.bodyText, variables: e.variables, isActive: e.isActive }} /> : null}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : null}
    </div>
  );
}
