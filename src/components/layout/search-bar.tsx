"use client";

import { Building2, Loader2, Package, Search, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Suggestion = { type: "product" | "supplier" | "category"; label: string; slug: string };

function hrefFor(s: Suggestion) {
  if (s.type === "product") return `/product/${s.slug}`;
  if (s.type === "supplier") return `/supplier/${s.slug}`;
  return `/products/${s.slug}`;
}

/** Global search box with debounced typeahead. Submits to /search?q=…&type=products|suppliers */
export function SearchBar({
  className,
  size = "md",
  defaultValue = "",
  defaultType = "products",
  autoFocus,
  showTypeToggle = true,
}: {
  className?: string;
  size?: "md" | "lg";
  defaultValue?: string;
  defaultType?: "products" | "suppliers";
  autoFocus?: boolean;
  showTypeToggle?: boolean;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tm = useTranslations("marketplace.typeahead");
  const router = useRouter();
  const id = React.useId();
  const [q, setQ] = React.useState(defaultValue);
  const [type, setType] = React.useState<"products" | "suppliers">(defaultType);
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const abortRef = React.useRef<AbortController | null>(null);
  const rootRef = React.useRef<HTMLFormElement>(null);

  // Debounced fetch of suggestions.
  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setActive(-1);
      } catch {
        /* aborted or offline */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  // Close on outside click.
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submitSearch = (term: string) => {
    const params = new URLSearchParams();
    if (term.trim()) params.set("q", term.trim());
    setOpen(false);
    router.push(`/${type === "suppliers" ? "manufacturers" : "search"}?${params.toString()}`);
  };
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      setOpen(false);
      router.push(hrefFor(items[active]));
      return;
    }
    submitSearch(q);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) {
      if (e.key === "ArrowDown" && items.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const grouped: Array<{ type: Suggestion["type"]; title: string; icon: React.ReactNode; rows: Array<{ s: Suggestion; index: number }> }> = [
    { type: "category", title: tm("categories"), icon: <Tag className="size-3.5" />, rows: [] },
    { type: "product", title: tm("products"), icon: <Package className="size-3.5" />, rows: [] },
    { type: "supplier", title: tm("suppliers"), icon: <Building2 className="size-3.5" />, rows: [] },
  ];
  items.forEach((s, index) => grouped.find((g) => g.type === s.type)?.rows.push({ s, index }));
  const showDropdown = open && q.trim().length >= 2;
  const h = size === "lg" ? "h-14" : "h-11";
  const listId = `${id}-listbox`;

  return (
    <form ref={rootRef} onSubmit={onSubmit} role="search" className={cn("relative w-full", className)}>
      <div className={cn("flex w-full items-stretch overflow-hidden rounded-lg border-2 border-ink-900 bg-white shadow-card", h)}>
        {showTypeToggle ? (
          <select
            aria-label="Search type"
            value={type}
            onChange={(e) => setType(e.target.value as "products" | "suppliers")}
            className="hidden border-r border-steel-200 bg-steel-50 px-3 text-sm font-medium text-ink-800 focus:outline-none sm:block"
          >
            <option value="products">{tc("labels.products")}</option>
            <option value="suppliers">{tc("labels.suppliers")}</option>
          </select>
        ) : null}
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("searchPlaceholder")}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          className={cn("min-w-0 flex-1 bg-transparent px-4 text-ink-900 placeholder:text-steel-400 focus:outline-none", size === "lg" ? "text-base" : "text-sm")}
        />
        <button type="submit" className="flex items-center gap-2 bg-lac-500 px-4 text-sm font-semibold text-white hover:bg-lac-600 sm:px-6">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          <span className="hidden sm:inline">{tc("actions.search")}</span>
        </button>
      </div>
      {showDropdown ? (
        <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-steel-200 bg-white text-left shadow-panel animate-slide-up">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-steel-500">{loading ? tm("loading") : tm("noSuggestions")}</p>
          ) : (
            grouped
              .filter((g) => g.rows.length)
              .map((g) => (
                <div key={g.type} className="border-b border-steel-100 last:border-b-0">
                  <p className="flex items-center gap-1.5 px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-steel-500">
                    {g.icon} {g.title}
                  </p>
                  {g.rows.map(({ s, index }) => (
                    <button
                      key={`${s.type}-${s.slug}`}
                      type="button"
                      role="option"
                      id={`${id}-opt-${index}`}
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => {
                        setOpen(false);
                        router.push(hrefFor(s));
                      }}
                      className={cn("block w-full truncate px-4 py-2 text-left text-sm text-ink-900", index === active ? "bg-ink-50" : "hover:bg-steel-50")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ))
          )}
          <button type="button" onClick={() => submitSearch(q)} className="block w-full bg-steel-50 px-4 py-2.5 text-left text-sm font-medium text-ink-800 hover:bg-steel-100">
            {tm("seeAll", { q: q.trim() })}
          </button>
        </div>
      ) : null}
    </form>
  );
}
