"use client";

import { SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Server-rendered filter controls live inside this GET form. Selects and checkboxes auto-submit on change;
 * text inputs submit on Enter or via the Apply button, so the page works without JavaScript too.
 */
export function FilterForm({ action, children, className, id = "filters" }: { action: string; children: React.ReactNode; className?: string; id?: string }) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    const type = (target as HTMLInputElement).type;
    if (tag === "SELECT" || (tag === "INPUT" && (type === "checkbox" || type === "radio" || type === "range"))) {
      if (timer.current) clearTimeout(timer.current);
      const form = e.currentTarget;
      timer.current = setTimeout(() => form.requestSubmit(), 120);
    }
  };
  return (
    <form id={id} method="get" action={action} onChange={onChange} className={className}>
      {children}
    </form>
  );
}

/** Collapsible wrapper: always visible on lg+, toggled by a button on smaller screens. */
export function FilterDrawer({ children, label, closeLabel, count }: { children: React.ReactNode; label: string; closeLabel: string; count?: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filter-drawer"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-steel-300 bg-white px-3 text-sm font-medium text-ink-900 hover:bg-steel-50 lg:hidden"
      >
        {open ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
        {open ? closeLabel : label}
        {!open && count ? <span className="rounded-full bg-ink-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">{count}</span> : null}
      </button>
      <div id="filter-drawer" className={cn("lg:block", open ? "mt-4 block" : "hidden")}>
        {children}
      </div>
    </>
  );
}

/** Sort dropdown that rewrites the `sort` query param (resets to page 1). */
export function SortSelect({ options, value, label, className }: { options: Array<{ value: string; label: string }>; value: string; label: string; className?: string }) {
  const router = useRouter();
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    if (e.target.value && e.target.value !== "relevance") url.searchParams.set("sort", e.target.value);
    else url.searchParams.delete("sort");
    router.push((url.pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/") + url.search);
  };
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-steel-600", className)}>
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className="h-10 rounded-md border border-steel-300 bg-white px-3 text-sm font-medium text-ink-900 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
