import { env } from "@/lib/env";

/**
 * Email provider abstraction. `console` logs in development; wire SMTP/Resend/SES by adding a provider
 * that implements EmailProvider — templates and callers stay unchanged.
 */
export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[email] to=${Array.isArray(message.to) ? message.to.join(",") : message.to} subject="${message.subject}"`);
    }
    return { id: `console_${Date.now()}` };
  }
}

let provider: EmailProvider | null = null;

export function emailProvider(): EmailProvider {
  if (provider) return provider;
  switch (env().EMAIL_PROVIDER) {
    // case "smtp": provider = new SmtpEmailProvider(env().SMTP_URL); break;
    // case "resend": provider = new ResendEmailProvider(process.env.RESEND_API_KEY!); break;
    default:
      provider = new ConsoleEmailProvider();
  }
  return provider;
}

export async function sendEmail(message: EmailMessage) {
  return emailProvider().send({ ...message, text: message.text ?? stripHtml(message.html) });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Minimal branded email layout used when no CMS template overrides it. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const base = env().NEXT_PUBLIC_APP_URL;
  return `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Inter,Arial,sans-serif;color:#2c323b">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#0f1b2d;padding:20px 28px;color:#fff;font-weight:700;font-size:18px;letter-spacing:0.08em">CANG</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0f1b2d">${title}</h1>
          <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
          ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:#0f1b2d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${cta.label}</a></p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f7f8fa;color:#7d899a;font-size:12px">CANG · Vietnam's B2B trade infrastructure · <a href="${base}" style="color:#7d899a">${base.replace(/^https?:\/\//, "")}</a></td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
