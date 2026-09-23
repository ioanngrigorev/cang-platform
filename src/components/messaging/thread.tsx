import { ArrowLeft, ChevronUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert, Avatar, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, localized } from "@/lib/utils";
import { counterpartyHref, MESSAGE_TZ, qs } from "@/modules/messaging/links";
import type { ConversationThread } from "@/modules/messaging/queries";
import { Composer } from "./composer";
import { ContextChip } from "./context-chip";
import type { ListState } from "./conversation-list";
import { MessageBubble } from "./message-bubble";
import { ThreadActions } from "./thread-actions";
import { ThreadPoller, ThreadScroller } from "./thread-live";

const TZ = MESSAGE_TZ;

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** The open conversation: header with counterparty + context, banners, scrollable messages, composer. */
export async function Thread({ locale, state, thread, canWrite }: { locale: string; state: ListState; thread: ConversationThread; canWrite: boolean }) {
  const t = await getTranslations("messaging.thread");
  const { base, tab, q, context, page } = state;
  const name = localized(thread.counterparty as unknown as Record<string, unknown>, "name", locale);
  const profileHref = counterpartyHref(thread.counterparty);
  const backHref = `${base}${qs({ tab, q, context, page: page > 1 ? page : null })}`;
  const earlierHref = `${base}/${thread.id}${qs({ tab, q, context, page: page > 1 ? page : null, limit: thread.limit + 50 })}`;
  const earlier = Math.max(0, thread.messageCount - thread.messages.length);

  // "Seen" goes on the last own message the counterparty has read.
  const lastOwn = [...thread.messages].reverse().find((m) => m.own);
  const seenId = lastOwn && thread.counterpartyReadAt && thread.counterpartyReadAt >= lastOwn.createdAt ? lastOwn.id : null;
  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000));

  const groups: Array<{ key: string; label: string; items: ConversationThread["messages"] }> = [];
  for (const m of thread.messages) {
    const key = dayKey(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: key === todayKey ? t("today") : key === yesterdayKey ? t("yesterday") : formatDate(m.createdAt, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ }), items: [m] });
  }
  const first = thread.messages[0]?.id ?? null;
  const lastMessage = thread.messages[thread.messages.length - 1]?.id ?? null;
  const composerDisabled = thread.status === "BLOCKED";

  return (
    <>
      <ThreadPoller />
      <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-3 py-3 sm:px-4">
        <Link href={backHref} className="-ml-1 rounded-md p-1.5 text-steel-500 hover:bg-steel-100 hover:text-ink-900 lg:hidden" aria-label={t("back")}>
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={name} src={thread.counterparty.logoUrl} size={40} square className="hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink-900">
            {profileHref ? (
              <Link href={profileHref} className="truncate hover:underline" title={t("viewProfile")}>
                {name}
              </Link>
            ) : (
              <span className="truncate">{name}</span>
            )}
            <VerifiedMark status={thread.counterparty.verificationStatus} />
            <span className="hidden shrink-0 text-xs font-normal text-steel-500 sm:inline">· {thread.counterparty.countryCode}</span>
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {thread.subject ? <p className="truncate text-xs text-steel-600">{thread.subject}</p> : null}
            <ContextChip context={thread.context} entity={thread.ref} side={thread.side} locale={locale} size="sm" className="max-w-[260px]" />
          </div>
        </div>
        <ThreadActions conversationId={thread.id} status={thread.status} isMuted={thread.isMuted} canWrite={canWrite} />
      </header>

      {thread.status === "ARCHIVED" ? (
        <Alert variant="warning" className="mx-3 mt-3 shrink-0 sm:mx-4">
          {t("archivedBanner")}
        </Alert>
      ) : null}
      {thread.status === "BLOCKED" ? (
        <Alert variant="danger" className="mx-3 mt-3 shrink-0 sm:mx-4">
          {t("blockedBanner")}
        </Alert>
      ) : null}

      <ThreadScroller firstMessageId={first} lastMessageId={lastMessage} className="min-h-0 flex-1 overflow-y-auto bg-steel-50/60 px-3 py-4 sm:px-5">
        {thread.hasEarlier ? (
          <div className="mb-4 flex justify-center">
            <Link href={earlierHref} className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-steel-700 hover:border-steel-300 hover:text-ink-900">
              <ChevronUp className="size-3.5" /> {t("loadEarlier")}
              {earlier > 0 ? <span className="text-steel-400">· {t("earlierCount", { count: earlier })}</span> : null}
            </Link>
          </div>
        ) : null}
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-steel-400">
                <span className="h-px flex-1 bg-hairline" />
                <span>{g.label}</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
              {g.items.map((m, i) => {
                const prev = i > 0 ? g.items[i - 1] : null;
                const showSender = !!m.sender && (!prev || prev.sender?.id !== m.sender.id || prev.type === "SYSTEM");
                return <MessageBubble key={m.id} message={m} locale={locale} side={thread.side} seen={m.id === seenId} showSender={showSender} />;
              })}
            </section>
          ))}
        </div>
      </ThreadScroller>

      {canWrite ? (
        <Composer conversationId={thread.id} counterpartyName={name} disabled={composerDisabled} />
      ) : (
        <p className="shrink-0 border-t border-hairline px-4 py-3 text-center text-xs text-steel-500">{t("readOnly")}</p>
      )}
    </>
  );
}
