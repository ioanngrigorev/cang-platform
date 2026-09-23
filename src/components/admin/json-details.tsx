import * as React from "react";
import { cn } from "@/lib/utils";

/** Native <details> with a pretty-printed JSON block (works without JS). */
export function JsonDetails({ summary, value, className, open }: { summary: React.ReactNode; value: unknown; className?: string; open?: boolean }) {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <details className={cn("group text-sm", className)} open={open}>
      <summary className="cursor-pointer select-none text-xs font-medium text-ink-700 hover:text-ink-900">{summary}</summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-hairline bg-steel-50 p-3 text-xs leading-relaxed text-ink-900">{text || "—"}</pre>
    </details>
  );
}

/** Side-by-side before / after JSON for audit rows. */
export function JsonDiff({ before, after, beforeLabel, afterLabel }: { before: unknown; after: unknown; beforeLabel: string; afterLabel: string }) {
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : JSON.stringify(v, null, 2));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-steel-500">{beforeLabel}</p>
        <pre className="max-h-72 overflow-auto rounded-md border border-hairline bg-steel-50 p-3 text-xs leading-relaxed text-ink-900">{fmt(before)}</pre>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-steel-500">{afterLabel}</p>
        <pre className="max-h-72 overflow-auto rounded-md border border-hairline bg-steel-50 p-3 text-xs leading-relaxed text-ink-900">{fmt(after)}</pre>
      </div>
    </div>
  );
}
