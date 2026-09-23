import * as React from "react";
import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number; hint?: string };

/**
 * Pure-CSS bar chart for the admin analytics page (no client JS). Vertical bars for time series,
 * horizontal bars for rankings. Colours come from tokens so both themes render correctly.
 */
export function BarChart({
  data,
  orientation = "vertical",
  format = (v) => String(v),
  className,
  emptyLabel,
}: {
  data: BarDatum[];
  orientation?: "vertical" | "horizontal";
  format?: (v: number) => string;
  className?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (!data.length || max === 0) return <p className="py-8 text-center text-sm text-steel-500">{emptyLabel ?? "—"}</p>;
  if (orientation === "horizontal") {
    return (
      <ol className={cn("space-y-2", className)}>
        {data.map((d, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-ink-900" title={d.label}>
              {d.label}
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-steel-100">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
            </span>
            <span className="whitespace-nowrap text-xs tabular-nums text-steel-600">{format(d.value)}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className={cn("overflow-x-auto", className)}>
      <ol className="flex h-44 min-w-full items-end gap-1.5" style={{ minWidth: `${data.length * 28}px` }}>
        {data.map((d, i) => (
          <li key={i} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${format(d.value)}${d.hint ? ` · ${d.hint}` : ""}`}>
            <span className="text-[10px] tabular-nums text-steel-500 opacity-0 transition-opacity group-hover:opacity-100">{format(d.value)}</span>
            <span className="w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-600" style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
            <span className="w-full truncate text-center text-[10px] text-steel-500">{d.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Stacked step funnel: each stage shows its count and the conversion from the previous stage. */
export function Funnel({ steps, className }: { steps: Array<{ label: string; value: number }>; className?: string }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const rate = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label} className="text-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-medium text-ink-900">{s.label}</span>
              <span className="tabular-nums text-steel-600">
                {s.value.toLocaleString()}
                {rate !== null ? <span className="ml-2 text-xs text-steel-500">{rate}%</span> : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-steel-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
