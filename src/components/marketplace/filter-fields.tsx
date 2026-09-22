import { X } from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ActiveChip } from "@/modules/catalog/filters";

/** Titled group inside the filter sidebar. */
export function FilterGroup({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-b border-steel-200 py-4 first:pt-0 last:border-b-0", className)}>
      <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-steel-500">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

export function FilterCheckbox({ name, value = "1", label, checked, count }: { name: string; value?: string; label: React.ReactNode; checked?: boolean; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-900">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 rounded border-steel-300 text-ink-900 focus:ring-brass-400" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? <span className="text-xs tabular-nums text-steel-400">{count}</span> : null}
    </label>
  );
}

const selectClass =
  "h-9 w-full rounded-md border border-steel-300 bg-white px-2.5 pr-8 text-sm text-ink-900 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%235f6b7c%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat";

export function FilterSelect({ name, value, options, anyLabel, ariaLabel }: { name: string; value?: string; options: Array<{ value: string; label: string; count?: number }>; anyLabel: string; ariaLabel: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={ariaLabel} className={selectClass}>
      <option value="">{anyLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
          {o.count != null ? ` (${o.count})` : ""}
        </option>
      ))}
    </select>
  );
}

const inputClass = "h-9 w-full rounded-md border border-steel-300 bg-white px-2.5 text-sm text-ink-900 shadow-sm placeholder:text-steel-400 focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100";

export function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

/** Removable chips for the filters currently applied. */
export function ActiveFilters({ chips, clearHref, title, clearLabel, removeLabel }: { chips: ActiveChip[]; clearHref: string; title: string; clearLabel: string; removeLabel: (label: string) => string }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-steel-500">{title}</span>
      {chips.map((c) => (
        <Link
          key={`${c.key}:${c.value}`}
          href={c.href}
          aria-label={removeLabel(c.label)}
          className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 py-1 pl-3 pr-2 text-xs font-medium text-ink-900 hover:bg-ink-100"
        >
          {c.label}
          <X className="size-3.5 text-ink-500" />
        </Link>
      ))}
      <Link href={clearHref} className="text-xs font-medium text-steel-600 underline-offset-2 hover:text-ink-900 hover:underline">
        {clearLabel}
      </Link>
    </div>
  );
}

/** Pill-style navigation chips (subcategories, industries, provinces). */
export function ChipLink({ href, active, children, count, className }: { href: string; active?: boolean; children: React.ReactNode; count?: number; className?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-ink-800 hover:border-steel-400 hover:bg-steel-50",
        className,
      )}
    >
      {children}
      {count != null ? <span className={cn("text-xs tabular-nums", active ? "text-white/70" : "text-steel-400")}>{count}</span> : null}
    </Link>
  );
}
