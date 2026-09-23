import { Search } from "lucide-react";
import * as React from "react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * GET filter form for admin lists. Submits to the current URL (so the locale prefix is kept) and
 * carries the given `keep` params as hidden inputs so tabs survive a new search.
 */
export function FilterBar({
  q,
  qPlaceholder,
  selects = [],
  keep = {},
  submitLabel,
  clearHref,
  clearLabel,
  className,
  children,
}: {
  q?: string;
  qPlaceholder?: string;
  selects?: Array<{ name: string; value: string; options: FilterOption[]; allLabel: string }>;
  keep?: Record<string, string | undefined>;
  submitLabel: string;
  clearHref?: string;
  clearLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form method="get" className={cn("flex flex-wrap items-end gap-2", className)}>
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {q !== undefined ? (
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-400" />
          <Input name="q" defaultValue={q} placeholder={qPlaceholder} className="pl-9" aria-label={qPlaceholder} />
        </div>
      ) : null}
      {selects.map((s) => (
        <Select key={s.name} name={s.name} defaultValue={s.value} className="w-auto min-w-[150px]" aria-label={s.allLabel}>
          <option value="">{s.allLabel}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ))}
      {children}
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
      {clearHref && clearLabel ? (
        <Button href={clearHref} variant="ghost">
          {clearLabel}
        </Button>
      ) : null}
    </form>
  );
}
