import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Full-width homepage / landing section. Tones alternate between white and steel-50; `ink` is for CTA bands.
 */
export function Section({
  tone = "white",
  className,
  children,
  id,
  as: Tag = "section",
}: {
  tone?: "white" | "steel" | "ink";
  className?: string;
  children: React.ReactNode;
  id?: string;
  as?: "section" | "div";
}) {
  const bg = { white: "bg-white", steel: "bg-steel-50", ink: "bg-ink-900 text-white" }[tone];
  return (
    <Tag id={id} className={cn("py-12 sm:py-16", bg, className)}>
      <div className="container">{children}</div>
    </Tag>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
  dark,
  align = "left",
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: { label: string; href: string };
  dark?: boolean;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", align === "center" && "sm:flex-col sm:items-center sm:text-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className={cn("mb-2 text-xs font-semibold uppercase tracking-[0.18em]", dark ? "text-brass-300" : "text-brass-600")}>{eyebrow}</p> : null}
        <h2 className={cn("text-2xl font-semibold sm:text-3xl", dark && "text-white")}>{title}</h2>
        {subtitle ? <p className={cn("mt-2 text-sm sm:text-base", dark ? "text-steel-300" : "text-steel-600")}>{subtitle}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className={cn("inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold", dark ? "text-brass-300 hover:text-brass-200" : "text-ink-700 hover:text-ink-900")}>
          {action.label}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** Numbered step (used by the RFQ band and the service pages). */
export function Step({ index, title, body, dark }: { index: number; title: React.ReactNode; body?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex gap-4">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full font-display text-base font-bold", dark ? "bg-brass-500 text-ink-950" : "bg-ink-900 text-white")}>{index}</span>
      <div>
        <h3 className={cn("text-base font-semibold", dark && "text-white")}>{title}</h3>
        {body ? <p className={cn("mt-1 text-sm", dark ? "text-steel-300" : "text-steel-600")}>{body}</p> : null}
      </div>
    </div>
  );
}

/** Horizontal flow diagram: chips joined by arrows, wraps on small screens. */
export function FlowSteps({ steps, className }: { steps: string[]; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-steel-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 shadow-card">
            <span className="flex size-5 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">{i + 1}</span>
            {s}
          </span>
          {i < steps.length - 1 ? <ArrowRight className="size-4 text-steel-400" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

export function StatTile({ value, label, hint, className, dark }: { value: React.ReactNode; label: React.ReactNode; hint?: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-5", dark ? "border-white/10 bg-white/5" : "border-steel-200 bg-white shadow-card", className)}>
      <p className={cn("font-display text-3xl font-bold tabular-nums", dark ? "text-white" : "text-ink-900")}>{value}</p>
      <p className={cn("mt-1 text-sm font-medium", dark ? "text-steel-200" : "text-ink-800")}>{label}</p>
      {hint ? <p className={cn("mt-1 text-xs", dark ? "text-steel-400" : "text-steel-500")}>{hint}</p> : null}
    </div>
  );
}

export function IconCard({ icon, title, body, href, cta, className }: { icon: React.ReactNode; title: React.ReactNode; body: React.ReactNode; href?: string; cta?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-lg border border-steel-200 bg-white p-6 shadow-card", className)}>
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-md bg-ink-50 text-ink-800 [&_svg]:size-5">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-steel-600">{body}</p>
      {href && cta ? (
        <Link href={href} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-ink-700 hover:text-ink-900">
          {cta} <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
