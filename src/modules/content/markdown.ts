import { marked } from "marked";

/**
 * Server-side markdown → HTML for CMS pages.
 * Content is authored by staff in the admin console, but we still strip anything executable:
 * script/style/iframe/object/embed elements, inline event handlers and javascript: URLs.
 */
const BLOCKED_TAGS = /<\/?(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi;
const EVENT_ATTRS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URLS = /\s+(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi;
const DATA_URLS = /\s+(href|src)\s*=\s*("|')\s*data:(?!image\/)[^"']*("|')/gi;

export function sanitizeHtml(html: string): string {
  return html.replace(BLOCKED_TAGS, "").replace(EVENT_ATTRS, "").replace(JS_URLS, ' $1="#"').replace(DATA_URLS, ' $1="#"');
}

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false });
  return sanitizeHtml(typeof html === "string" ? html : "");
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Extract H2/H3 headings and inject ids so a table of contents can link to them. */
export function withHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    toc.push({ id, text, level: lvl === "2" ? 2 : 3 });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

/** Strip the leading H1 (the page title is rendered by the layout). */
export function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");
}
