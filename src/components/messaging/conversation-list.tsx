import { BellOff, Inbox, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Avatar, Button, EmptyState, LinkTabs, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, localized, timeAgo } from "@/lib/utils";
import { contextLabel, qs } from "@/modules/messaging/links";
import type { ConversationListItem, ConversationTab } from "@/modules/messaging/queries";
import { ConversationFilters } from "./conversation-filters";
import { ContextChip } from "./context-chip";

export type ListState = { base: string; tab: ConversationTab; q: string | null; context: string | null; page: number; selectedId: string | null };

const TABS: ConversationTab[] = ["all", "unread", "archived"];

/** Server-rendered conversation list: tabs, filters, rows linking to the thread, compact pagination. */
export async function ConversationList({
  locale,
  state,
  rows,
  counts,
  total,
  totalPages,
  pageSize,
}: {
  locale: string;
  state: ListState;
  rows: ConversationListItem[];
  counts: Record<ConversationTab, number>;
  total: number;
  totalPages: number;
  pageSize: number;
}) {
  const t = await getTranslations("messaging.list");
  const tc = await getTranslations("messaging.context");
  const { base, tab, q, context, page, selectedId } = state;
  // Filters and tabs keep the open thread; row links keep the filters.
  const listPath = selectedId ? `${base}/${selectedId}` : base;
  const hrefFor = (over: Partial<{ tab: string; q: string | null; context: string | null; page: number }>) => `${listPath}${qs({ tab, q, context, ...over, page: over.page && over.page > 1 ? over.page : null })}`;
  const hasFilters = !!q || !!context;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <>
      <div className="shrink-0 border-b border-hairline px-3 pt-1">
        <LinkTabs current={tab} className="border-0" tabs={TABS.map((value) => ({ value, label: t(`tabs.${value}`), href: hrefFor({ tab: value, page: 1 }), count: value === "unread" ? counts.unread : undefined }))} />
      </div>
      <div className="shrink-0 border-b border-hairline px-3 py-2">
        <ConversationFilters q={q} context={context} contextLabels={{ GENERAL: tc("GENERAL"), PRODUCT: tc("PRODUCT"), RFQ: tc("RFQ"), QUOTATION: tc("QUOTATION"), ORDER: tc("ORDER"), DISPUTE: tc("DISPUTE") }} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={hasFilters ? <SearchX /> : <Inbox />}
            className="border-0 bg-transparent py-6"
            title={hasFilters ? t("emptyFilteredTitle") : tab === "unread" ? t("emptyUnreadTitle") : tab === "archived" ? t("emptyArchivedTitle") : t("emptyTitle")}
            description={hasFilters ? t("emptyFilteredDescription") : tab === "unread" ? t("emptyUnreadDescription") : tab === "archived" ? t("emptyArchivedDescription") : t("emptyDescription")}
            action={
              hasFilters ? (
                <Button href={hrefFor({ q: null, context: null, page: 1 })} variant="secondary" size="sm">
                  {t("clearFilters")}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
          {rows.map((c) => {
            const selected = c.id === selectedId;
            const name = localized(c.counterparty as unknown as Record<string, unknown>, "name", locale);
            const title = c.subject ?? contextLabel(c.ref, locale) ?? tc(c.context);
            const unread = c.unread > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`${base}/${c.id}${qs({ tab, q, context, page: page > 1 ? page : null })}`}
                  aria-current={selected ? "page" : undefined}
                  className={cn("flex gap-3 border-l-[3px] px-4 py-3 transition-colors hover:bg-steel-50", selected ? "border-l-brand-500 bg-brand-50/70" : unread ? "border-l-transparent bg-brand-50/30" : "border-l-transparent")}
                >
                  <Avatar name={name} src={c.counterparty.logoUrl} size={40} square className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("flex min-w-0 items-center gap-1 truncate text-sm", unread ? "font-semibold text-ink-900" : "font-medium text-ink-900")}>
                        <span className="truncate">{name}</span>
                        <VerifiedMark status={c.counterparty.verificationStatus} className="size-3.5 shrink-0" />
                      </p>
                      {c.lastMessageAt ? <time dateTime={c.lastMessageAt.toISOString()} className={cn("shrink-0 text-[11px]", unread ? "font-medium text-brand-700" : "text-steel-500")}>{timeAgo(c.lastMessageAt, locale)}</time> : null}
                    </div>
                    <p className={cn("truncate text-xs", unread ? "font-medium text-ink-900" : "text-steel-600")}>{title}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-xs", unread ? "text-ink-700" : "text-steel-500")}>
                        {c.lastMessagePreview ?? t("noMessages")}
                      </p>
                      {unread ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold text-on-brand" aria-label={t("unreadCount", { count: c.unread })}>
                          {c.unread}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <ContextChip context={c.context} entity={c.ref} side={c.side} locale={locale} size="sm" linked={false} />
                      {c.isMuted ? <BellOff className="size-3.5 text-steel-400" aria-label={t("muted")} /> : null}
                      {c.status === "ARCHIVED" && tab !== "archived" ? <span className="text-[11px] text-steel-500">{t("archived")}</span> : null}
                      {c.status === "BLOCKED" ? <span className="text-[11px] text-danger-600">{t("blocked")}</span> : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-2 text-xs text-steel-500">
          <span>{t("showing", { from, to, total })}</span>
          <span className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={hrefFor({ page: page - 1 })} className="rounded-md border border-steel-300 px-2 py-1 text-ink-900 hover:bg-steel-50">
                {t("previous")}
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={hrefFor({ page: page + 1 })} className="rounded-md border border-steel-300 px-2 py-1 text-ink-900 hover:bg-steel-50">
                {t("next")}
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}
    </>
  );
}
