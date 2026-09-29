import { env } from "@/lib/env";

/**
 * E-mail delivery. EMAIL_PROVIDER picks the transport:
 *   console — log only (development; nothing leaves the server)
 *   resend  — Resend HTTP API (RESEND_API_KEY); HTTPS only, so it works where SMTP ports are blocked
 *   smtp    — any SMTP server via SMTP_URL, e.g. smtps://user:pass@smtp-relay.brevo.com:465
 * EMAIL_FROM is the sender ("CANG <no-reply@mail.cang.vn>"), EMAIL_REPLY_TO an optional reply address.
 * Templates and callers do not change with the provider; see ./email-templates for the texts.
 */
export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id?: string }>;
}

const list = (to: string | string[]) => (Array.isArray(to) ? to : [to]);

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  async send(message: EmailMessage) {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[email] to=${list(message.to).join(",")} subject="${message.subject}"`);
    }
    return { id: `console_${Date.now()}` };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {}

  async send(message: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: list(message.to),
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo ?? this.replyTo ?? undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? body.name ?? res.statusText}`);
    return { id: body.id };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transport: Promise<import("nodemailer").Transporter> | null = null;
  constructor(
    private readonly url: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {}

  private getTransport() {
    this.transport ??= import("nodemailer").then((m) => m.createTransport(this.url));
    return this.transport;
  }

  async send(message: EmailMessage) {
    const transport = await this.getTransport();
    // nodemailer's own timeouts run to minutes; a password-reset request should not hang that long.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("SMTP timeout after 30 s")), 30_000);
    });
    const sending = transport.sendMail({
      from: this.from,
      to: list(message.to),
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo ?? this.replyTo ?? undefined,
    });
    try {
      const info = await Promise.race([sending, timeout]);
      return { id: info.messageId };
    } finally {
      clearTimeout(timer);
    }
  }
}

let provider: EmailProvider | null = null;

export function emailProvider(): EmailProvider {
  if (provider) return provider;
  const e = env();
  const replyTo = e.EMAIL_REPLY_TO || undefined;
  if (e.EMAIL_PROVIDER === "resend" && e.RESEND_API_KEY) provider = new ResendEmailProvider(e.RESEND_API_KEY, e.EMAIL_FROM, replyTo);
  else if (e.EMAIL_PROVIDER === "smtp" && e.SMTP_URL) provider = new SmtpEmailProvider(e.SMTP_URL, e.EMAIL_FROM, replyTo);
  else {
    if (e.EMAIL_PROVIDER !== "console") console.error(`[email] EMAIL_PROVIDER=${e.EMAIL_PROVIDER} but its credentials are missing — e-mails are only logged`);
    provider = new ConsoleEmailProvider();
  }
  return provider;
}

/** Sends one message. Throws on delivery errors (after logging them); fire-and-forget callers should `.catch()`. */
export async function sendEmail(message: EmailMessage) {
  const p = emailProvider();
  try {
    return await p.send({ ...message, text: message.text ?? htmlToText(message.html) });
  } catch (err) {
    console.error(`[email] ${p.name} failed to=${list(message.to).join(",")} subject="${message.subject}": ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/** Plain-text part: keeps paragraph breaks and link targets so text-only clients stay usable. */
function htmlToText(html: string) {
  return html
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<\/(p|h1|h2|tr|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Branded e-mail layout. `footer` lines are already localised by the caller (see email-templates). */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }, opts: { lang?: string; footer?: { tagline: string; why?: string } } = {}) {
  const base = env().NEXT_PUBLIC_APP_URL;
  const footer = opts.footer ?? { tagline: "Vietnam's B2B trade infrastructure" };
  return `<!doctype html><html lang="${opts.lang ?? "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f4f6fa;font-family:Inter,Arial,sans-serif;color:#2c323b">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6fa;padding:32px 12px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#0f1b2d;padding:20px 28px;color:#fff;font-weight:700;font-size:18px;letter-spacing:0.08em">CANG</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0f1b2d">${title}</h1>
          <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
          ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:#0f1b2d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${cta.label}</a></p><p style="margin:16px 0 0;font-size:12px;color:#7d899a;word-break:break-all">${cta.url}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f7f8fa;color:#7d899a;font-size:12px;line-height:1.5">CANG · ${footer.tagline} · <a href="${base}" style="color:#7d899a">${base.replace(/^https?:\/\//, "")}</a>${footer.why ? `<br>${footer.why}` : ""}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
