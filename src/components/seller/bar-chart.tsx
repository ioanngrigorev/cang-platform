import { cn } from "@/lib/utils";

export type BarPoint = { label: string; value: number; title?: string };

/**
 * Dependency-free vertical bar chart: one flex column per point, bar height = value / max.
 * Renders fine in both themes because it only uses token colours.
 */
export function BarChart({ points, className, height = 160, formatValue, accent = "bg-brand-500" }: { points: BarPoint[]; className?: string; height?: number; formatValue?: (v: number) => string; accent?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const every = points.length > 16 ? Math.ceil(points.length / 8) : 1;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {points.map((p, i) => {
          const pct = Math.max(p.value > 0 ? 3 : 0, Math.round((p.value / max) * 100));
          return (
            <div key={`${p.label}-${i}`} className="group relative flex h-full flex-1 flex-col justify-end" title={p.title ?? `${p.label}: ${formatValue ? formatValue(p.value) : p.value}`}>
              <div className={cn("w-full rounded-t-sm transition-opacity group-hover:opacity-80", p.value > 0 ? accent : "bg-steel-200")} style={{ height: `${pct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {points.map((p, i) => (
          <div key={`${p.label}-${i}-l`} className="relative h-3 flex-1 text-[10px] leading-none text-steel-500">
            {i % every === 0 ? <span className="absolute left-0 top-0 whitespace-nowrap">{p.label}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars for ranked lists (top products, funnel steps). */
export function HBar({ value, max, label, meta, accent = "bg-brand-500" }: { value: number; max: number; label: React.ReactNode; meta?: React.ReactNode; accent?: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0 truncate text-ink-900">{label}</div>
        <div className="shrink-0 text-xs text-steel-600">{meta}</div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-steel-100">
        <div className={cn("h-full rounded-full", accent)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
