"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Input, Select } from "@/components/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import { CONVERSATION_CONTEXTS } from "@/modules/messaging/schemas";

/** Search box + topic select; updates the query string in place so the open thread stays open. */
export function ConversationFilters({ q, context, contextLabels }: { q: string | null; context: string | null; contextLabels: Record<string, string> }) {
  const t = useTranslations("messaging.list");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [value, setValue] = React.useState(q ?? "");
  React.useEffect(() => setValue(q ?? ""), [q]);

  const apply = (next: { q?: string | null; context?: string | null }) => {
    const sp = new URLSearchParams(search.toString());
    const set = (k: string, v: string | null | undefined) => (v ? sp.set(k, v) : sp.delete(k));
    if ("q" in next) set("q", next.q?.trim() || null);
    if ("context" in next) set("context", next.context || null);
    sp.delete("page");
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: value });
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-steel-400" aria-hidden />
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if ((value.trim() || null) !== (q ?? null)) apply({ q: value });
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-9 pl-8 pr-8 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-ink-900"
            aria-label={t("clearFilters")}
            onClick={() => {
              setValue("");
              apply({ q: null });
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <Select name="context" value={context ?? ""} onChange={(e) => apply({ context: e.target.value || null })} aria-label={t("contextLabel")} className="h-9 w-auto max-w-[9.5rem] text-sm">
        <option value="">{t("allContexts")}</option>
        {CONVERSATION_CONTEXTS.map((c) => (
          <option key={c} value={c}>
            {contextLabels[c] ?? c}
          </option>
        ))}
      </Select>
    </form>
  );
}
