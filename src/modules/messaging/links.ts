import { localized } from "@/lib/utils";
import type { ConversationSide } from "./schemas";

/** The entity a conversation is attached to, with everything the UI needs to label and link it. */
export type ContextRef =
  | { type: "PRODUCT"; id: string; slug: string; title: string; titleVi: string | null }
  | { type: "RFQ"; id: string; number: string; title: string }
  | { type: "QUOTATION"; id: string; number: string; total: number | null; currency: string | null; validUntil: Date | null; status: string | null }
  | { type: "ORDER"; id: string; number: string }
  | null;

/** Times in threads are shown in the platform timezone (matches next-intl's `timeZone`). */
export const MESSAGE_TZ = "Asia/Ho_Chi_Minh";

export function messagesBase(side: ConversationSide): string {
  return side === "buyer" ? "/buyer/messages" : "/seller/messages";
}

/** Where the context chip points for the viewing side: public product page, or the side's own RFQ/quotation/order page. */
export function contextHref(ref: ContextRef, side: ConversationSide): string | null {
  if (!ref) return null;
  const base = side === "buyer" ? "/buyer" : "/seller";
  switch (ref.type) {
    case "PRODUCT":
      return `/product/${ref.slug}`;
    case "RFQ":
      return `${base}/rfqs/${ref.id}`;
    case "QUOTATION":
      return `${base}/quotations/${ref.id}`;
    case "ORDER":
      return `${base}/orders/${ref.id}`;
  }
}

export function contextLabel(ref: ContextRef, locale: string): string | null {
  if (!ref) return null;
  switch (ref.type) {
    case "PRODUCT":
      return localized(ref as unknown as Record<string, unknown>, "title", locale);
    case "RFQ":
      return `${ref.number} · ${ref.title}`;
    case "QUOTATION":
    case "ORDER":
      return ref.number;
  }
}

/** Public profile of the counterparty, when it has one (suppliers only). */
export function counterpartyHref(c: { slug: string; isSeller: boolean }): string | null {
  return c.isSeller ? `/supplier/${c.slug}` : null;
}

/** Builds a query string from defined, non-empty values. */
export function qs(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
