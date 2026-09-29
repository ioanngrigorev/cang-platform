import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import en from "@/messages/en/emails.json";
import vi from "@/messages/vi/emails.json";
import { emailLayout, escapeHtml } from "./email";

/**
 * Transactional e-mail texts in the recipient's language.
 *
 * Built-in wording lives in src/messages/{en,vi}/emails.json. An admin can override any template
 * per locale in Admin → CMS → E-mail templates: an active template with the same code and locale
 * replaces the subject and body. Placeholders are written {{name}} there; values are HTML-escaped,
 * and the call-to-action button (built-in label, {{url}} target) is added unless the body already
 * links to {{url}}.
 */
export const EMAIL_TEMPLATE_CODES = {
  welcome: ["name", "company", "kind", "url"],
  password_reset: ["email", "url"],
  team_invite: ["company", "role", "days", "url"],
  test: ["time", "provider", "from"],
} as const;
export type EmailTemplateCode = keyof typeof EMAIL_TEMPLATE_CODES;

type Dict = typeof en;
const DICTS: Record<string, Dict> = { en, vi };
export type EmailLocale = "en" | "vi";
export const emailLocale = (locale: string | null | undefined): EmailLocale => (locale === "vi" ? "vi" : "en");
export const emailDict = (locale: string | null | undefined): Dict => DICTS[emailLocale(locale)];

type Vars = Record<string, string | number>;

/** {name} (built-in texts) or {{name}} (CMS templates) → value; values are escaped when `html`. */
function fill(template: string, vars: Vars, html: boolean) {
  return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (m, key: string) => (key in vars ? (html ? escapeHtml(String(vars[key])) : String(vars[key])) : m));
}

export function emailFooter(locale: string | null | undefined) {
  const d = emailDict(locale);
  return { lang: emailLocale(locale), footer: { tagline: d.layout.tagline, why: d.layout.why } };
}

async function cmsOverride(code: string, locale: EmailLocale) {
  try {
    const [row] = await db
      .select({ subject: emailTemplates.subject, bodyHtml: emailTemplates.bodyHtml })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.code, code), eq(emailTemplates.locale, locale), eq(emailTemplates.isActive, true)))
      .limit(1);
    return row ?? null;
  } catch {
    return null; // the built-in text is always a valid fallback
  }
}

/** Subject + HTML for a transactional e-mail. `vars.url` becomes the button target. */
export async function renderEmail(code: EmailTemplateCode, locale: string | null | undefined, vars: Vars): Promise<{ subject: string; html: string }> {
  const loc = emailLocale(locale);
  const d = emailDict(loc)[code] as { subject: string; title: string; body: string[]; cta?: string };
  const url = typeof vars.url === "string" ? vars.url : undefined;
  const override = await cmsOverride(code, loc);
  if (override) {
    const subject = fill(override.subject, vars, false);
    const linksUrl = /\{\{\s*url\s*\}\}/.test(override.bodyHtml);
    const cta = url && d.cta && !linksUrl ? { label: escapeHtml(d.cta), url } : undefined;
    return { subject, html: emailLayout(escapeHtml(subject), fill(override.bodyHtml, vars, true), cta, emailFooter(loc)) };
  }
  const subject = fill(d.subject, vars, false);
  const body = d.body.map((p) => `<p style="margin:0 0 12px">${fill(p, vars, true)}</p>`).join("");
  const cta = url && d.cta ? { label: escapeHtml(d.cta), url } : undefined;
  return { subject, html: emailLayout(fill(escapeHtml(d.title), vars, true), body, cta, emailFooter(loc)) };
}
