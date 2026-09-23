import { ArrowRightLeft, ExternalLink, FileText, Image as ImageIcon, Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { formatBytes, MESSAGE_TZ } from "@/modules/messaging/links";
import type { ThreadAttachment, ThreadMessage } from "@/modules/messaging/queries";
import type { ConversationSide } from "@/modules/messaging/schemas";

type QuotationPayload = { quotationId?: string; quotationNumber?: string; total?: number; currency?: string; leadTimeDays?: number; validUntil?: string };
type CounterOfferPayload = { unitPrice?: number; quantity?: number; currency?: string; note?: string };
type SystemPayload = { event?: string };

/** One message in a thread: own company on the right in the brand tint, counterparty on the left, system notices centred. */
export async function MessageBubble({ message, locale, side, seen, showSender }: { message: ThreadMessage; locale: string; side: ConversationSide; seen: boolean; showSender: boolean }) {
  const t = await getTranslations("messaging.thread");
  const time = formatDate(message.createdAt, locale, { hour: "2-digit", minute: "2-digit", timeZone: MESSAGE_TZ });

  if (message.type === "SYSTEM" || !message.sender) {
    const event = (message.payload as SystemPayload | null)?.event;
    const eventLabel = event && ["RFQ_INVITATION", "ORDER_CREATED", "SHIPMENT_DEPARTED", "DISPUTE_OPENED"].includes(event) ? t(`events.${event}`) : t("events.DEFAULT");
    return (
      <div data-message-id={message.id} className="flex justify-center px-2 py-1">
        <div className="max-w-[85%] rounded-lg bg-steel-100/80 px-3 py-2 text-center text-xs text-steel-600">
          <span className="font-medium text-steel-700">{eventLabel}</span>
          {message.body ? <span> · {message.body}</span> : null}
          <span className="ml-1.5 text-steel-400">{time}</span>
        </div>
      </div>
    );
  }

  const own = message.own;
  return (
    <div data-message-id={message.id} className={cn("flex items-end gap-2 px-1", own ? "justify-end" : "justify-start")}>
      {!own ? <Avatar name={message.sender.name} src={message.sender.avatarUrl} size={28} className="mb-5 hidden sm:inline-flex" /> : null}
      <div className={cn("flex max-w-[85%] flex-col sm:max-w-[75%]", own ? "items-end" : "items-start")}>
        {showSender ? <p className="mb-0.5 px-1 text-[11px] font-medium text-steel-500">{message.mine ? t("you") : message.sender.name}</p> : null}
        <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm", own ? "rounded-br-md bg-brand-50 text-ink-900" : "rounded-bl-md bg-steel-100 text-ink-900")}>
          {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
          {message.type === "QUOTATION" ? <QuotationCard payload={message.payload as QuotationPayload | null} locale={locale} side={side} /> : null}
          {message.type === "COUNTER_OFFER" ? <CounterOfferCard payload={message.payload as CounterOfferPayload | null} locale={locale} /> : null}
          {message.attachments.length ? <Attachments items={message.attachments} own={own} /> : null}
        </div>
        <p className="mt-0.5 px-1 text-[11px] text-steel-400">
          <time dateTime={message.createdAt.toISOString()}>{time}</time>
          {seen ? <span> · {t("seen")}</span> : null}
        </p>
      </div>
    </div>
  );
}

async function QuotationCard({ payload, locale, side }: { payload: QuotationPayload | null; locale: string; side: ConversationSide }) {
  const t = await getTranslations("messaging.thread.quotation");
  if (!payload?.quotationNumber) return null;
  const href = payload.quotationId ? `${side === "buyer" ? "/buyer" : "/seller"}/quotations/${payload.quotationId}` : null;
  return (
    <div className="mt-2 rounded-lg border border-hairline bg-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
        <Receipt className="size-3.5 text-brand-700" /> {t("title", { number: payload.quotationNumber })}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-steel-500">{t("total")}</dt>
        <dd className="text-right font-semibold tabular-nums text-ink-900">{formatMoney(payload.total ?? null, payload.currency ?? "USD", locale)}</dd>
        {payload.leadTimeDays != null ? (
          <>
            <dt className="text-steel-500">{t("leadTime")}</dt>
            <dd className="text-right text-ink-900">{t("leadTimeDays", { count: payload.leadTimeDays })}</dd>
          </>
        ) : null}
        {payload.validUntil ? (
          <>
            <dt className="text-steel-500">{t("validUntil")}</dt>
            <dd className="text-right text-ink-900">{formatDate(payload.validUntil, locale)}</dd>
          </>
        ) : null}
      </dl>
      {href ? (
        <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
          {t("view")} <ExternalLink className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}

async function CounterOfferCard({ payload, locale }: { payload: CounterOfferPayload | null; locale: string }) {
  const t = await getTranslations("messaging.thread.counterOffer");
  if (!payload || payload.unitPrice == null) return null;
  const currency = payload.currency ?? "USD";
  return (
    <div className="mt-2 rounded-lg border border-hairline bg-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
        <ArrowRightLeft className="size-3.5 text-brand-700" /> {t("title")}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-steel-500">{t("unitPrice")}</dt>
        <dd className="text-right font-semibold tabular-nums text-ink-900">{formatMoney(payload.unitPrice, currency, locale, { maxFractionDigits: 4 })}</dd>
        {payload.quantity != null ? (
          <>
            <dt className="text-steel-500">{t("quantity")}</dt>
            <dd className="text-right tabular-nums text-ink-900">{formatNumber(payload.quantity, locale)}</dd>
          </>
        ) : null}
      </dl>
      {payload.note ? (
        <p className="mt-2 text-xs text-steel-600">
          <span className="font-medium text-steel-700">{t("note")}:</span> {payload.note}
        </p>
      ) : null}
    </div>
  );
}

function Attachments({ items, own }: { items: ThreadAttachment[]; own: boolean }) {
  const images = items.filter((a) => a.mimeType.startsWith("image/"));
  const files = items.filter((a) => !a.mimeType.startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length ? (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-hairline bg-surface" title={a.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name} className="max-h-48 max-w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
      {files.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors", own ? "border-brand-100 bg-surface hover:border-brand-300" : "border-hairline bg-surface hover:border-steel-300")}
        >
          {a.mimeType.startsWith("image/") ? <ImageIcon className="size-4 shrink-0 text-steel-500" /> : <FileText className="size-4 shrink-0 text-steel-500" />}
          <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{a.name}</span>
          <span className="shrink-0 text-steel-500">{formatBytes(a.sizeBytes)}</span>
        </a>
      ))}
    </div>
  );
}
