import { ChevronRight, Star } from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { cn, initials } from "@/lib/utils";

export function Avatar({ src, name, size = 40, className, square }: { src?: string | null; name: string; size?: number; className?: string; square?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.max(10, size / 2.6) };
  const shape = square ? "rounded-md" : "rounded-full";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} style={style} className={cn(shape, "shrink-0 object-cover bg-steel-100", className)} />;
  }
  return (
    <span style={style} className={cn(shape, "inline-flex shrink-0 items-center justify-center bg-ink-100 font-semibold text-ink-700", className)} aria-label={name}>
      {initials(name)}
    </span>
  );
}

export function RatingStars({ value, count, size = 14, className, showValue = true }: { value: number | string | null | undefined; count?: number | null; size?: number; className?: string; showValue?: boolean }) {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-steel-600", className)} aria-label={`${v.toFixed(1)} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} width={size} height={size} className={cn(i <= Math.round(v) ? "fill-brass-400 text-brass-400" : "fill-steel-200 text-steel-200")} />
        ))}
      </span>
      {showValue ? <span className="font-medium text-ink-900">{v > 0 ? v.toFixed(1) : "–"}</span> : null}
      {count != null ? <span>({count})</span> : null}
    </span>
  );
}

export function Breadcrumbs({ items, className }: { items: Array<{ label: React.ReactNode; href?: string }>; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-steel-500", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 text-steel-400" /> : null}
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="hover:text-ink-900">
                {it.label}
              </Link>
            ) : (
              <span className={cn(i === items.length - 1 && "text-ink-900 font-medium")}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs, className, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; breadcrumbs?: Array<{ label: React.ReactNode; href?: string }>; className?: string; eyebrow?: React.ReactNode }) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-3" /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brass-600">{eyebrow}</p> : null}
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-steel-600 sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeading({ title, description, action, className, as: Tag = "h2" }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4", className)}>
      <div>
        <Tag className={cn("font-semibold", Tag === "h2" ? "text-xl sm:text-2xl" : "text-lg")}>{title}</Tag>
        {description ? <p className="mt-1 text-sm text-steel-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

/** Link-based tabs for server-rendered pages (active state derived from `current`). */
export function LinkTabs({ tabs, current, className }: { tabs: Array<{ label: React.ReactNode; href: string; value: string; count?: number }>; current: string; className?: string }) {
  return (
    <div className={cn("border-b border-steel-200", className)}>
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((t) => {
          const active = t.value === current;
          return (
            <Link
              key={t.value}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "border-ink-900 text-ink-900" : "border-transparent text-steel-500 hover:border-steel-300 hover:text-ink-900",
              )}
            >
              {t.label}
              {t.count != null ? <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-xs", active ? "bg-ink-900 text-white" : "bg-steel-100 text-steel-600")}>{t.count}</span> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor, className }: { page: number; totalPages: number; hrefFor: (page: number) => string; className?: string }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) pages.push(p);
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm";
  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(btn, "border-steel-300 bg-white hover:bg-steel-50")}>
          ‹
        </Link>
      ) : null}
      {start > 1 ? (
        <>
          <Link href={hrefFor(1)} className={cn(btn, "border-steel-300 bg-white hover:bg-steel-50")}>
            1
          </Link>
          {start > 2 ? <span className="px-1 text-steel-400">…</span> : null}
        </>
      ) : null}
      {pages.map((p) => (
        <Link key={p} href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(btn, p === page ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white hover:bg-steel-50")}>
          {p}
        </Link>
      ))}
      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="px-1 text-steel-400">…</span> : null}
          <Link href={hrefFor(totalPages)} className={cn(btn, "border-steel-300 bg-white hover:bg-steel-50")}>
            {totalPages}
          </Link>
        </>
      ) : null}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(btn, "border-steel-300 bg-white hover:bg-steel-50")}>
          ›
        </Link>
      ) : null}
    </nav>
  );
}

/** Safe JSON-LD script tag for structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
