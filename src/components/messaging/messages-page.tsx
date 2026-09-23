import { MessageSquare, PenSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { canCompany, requireCompany } from "@/modules/auth/current-user";
import { messagesBase } from "@/modules/messaging/links";
import { CONVERSATION_TABS, conversationTabCounts, getConversation, listConversations, type ConversationTab } from "@/modules/messaging/queries";
import type { ConversationSide } from "@/modules/messaging/schemas";
import { markRead } from "@/modules/messaging/service";
import { ConversationList, type ListState } from "./conversation-list";
import { Thread } from "./thread";

export type MessagesSearchParams = { tab?: string; q?: string; context?: string; page?: string; limit?: string };

/**
 * The inbox shared by /buyer/messages and /seller/messages: conversation list on the left, the selected
 * thread on the right (stacked on small screens). The company's whole inbox is shown on both dashboards; each
 * conversation knows which side the company is on, so context links always point at the right pages.
 */
export async function MessagesPage({ side, locale, searchParams, selectedId }: { side: ConversationSide; locale: string; searchParams: MessagesSearchParams; selectedId?: string }) {
  const auth = await requireCompany({ permission: "messages.read" });
  const { user, company } = auth;
  const t = await getTranslations("messaging.list");
  const base = messagesBase(side);

  const tab = (CONVERSATION_TABS.includes(searchParams.tab as ConversationTab) ? searchParams.tab : "all") as ConversationTab;
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const q = searchParams.q?.trim() || null;
  const context = searchParams.context?.trim() || null;
  const limit = Number(searchParams.limit ?? 0) || undefined;
  const state: ListState = { base, tab, q, context, page, selectedId: selectedId ?? null };

  const [list, counts, thread] = await Promise.all([
    listConversations(company.id, user.id, { tab, q, context, page }),
    conversationTabCounts(company.id, user.id),
    selectedId ? getConversation(company.id, user.id, selectedId, { limit }) : Promise.resolve(null),
  ]);
  if (selectedId && !thread) notFound();
  // Opening a thread is what "reading" means; a later poll re-renders with the fresh lastReadAt.
  if (thread) await markRead(thread.id, user.id, company.id);

  const hasFilters = !!q || !!context;
  const inboxEmpty = counts.all === 0 && counts.archived === 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        className={cn("mb-4", thread && "hidden lg:block")}
        actions={
          <Button href={`${base}/new`} variant="secondary" size="sm">
            <PenSquare /> {t("newMessage")}
          </Button>
        }
      />

      {inboxEmpty && !hasFilters ? (
        <EmptyState
          icon={<MessageSquare />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button href={side === "buyer" ? "/manufacturers" : "/seller/rfqs"} variant="primary">
              {side === "buyer" ? t("browseSuppliers") : t("browseRfqs")}
            </Button>
          }
        />
      ) : (
        <div className={cn("grid w-full max-w-full grid-cols-1 overflow-hidden rounded-xl border border-hairline bg-surface shadow-card [&>*]:min-w-0", "lg:h-[calc(100dvh-13rem)] lg:min-h-[520px] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]")}>
          <aside className={cn("flex min-h-0 flex-col border-hairline lg:border-r", thread ? "hidden lg:flex" : "flex")}>
            <ConversationList locale={locale} state={state} rows={list.rows} counts={counts} total={list.total} totalPages={list.totalPages} pageSize={list.pageSize} />
          </aside>
          <section className={cn("flex min-h-0 flex-col", thread ? "flex h-[calc(100dvh-6.5rem)] min-h-[420px] lg:h-auto" : "hidden lg:flex")}>
            {thread ? (
              <Thread locale={locale} state={state} thread={thread} canWrite={canCompany(auth, "messages.write")} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState icon={<MessageSquare />} title={t("selectTitle")} description={t("selectDescription")} className="border-0 bg-transparent" />
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
