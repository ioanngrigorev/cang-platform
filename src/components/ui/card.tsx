import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, hover, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn("rounded-lg border border-steel-200 bg-white shadow-card", hover && "transition-shadow hover:shadow-card-hover hover:border-steel-300", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, title, description, action, ...props }: React.HTMLAttributes<HTMLDivElement> & { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-steel-100 px-5 py-4", className)} {...props}>
      <div className="min-w-0">
        {title ? <h3 className="text-base font-semibold text-ink-900">{title}</h3> : null}
        {description ? <p className="mt-0.5 text-sm text-steel-500">{description}</p> : null}
        {props.children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-steel-100 px-5 py-3", className)} {...props} />;
}

export function StatCard({ label, value, hint, icon, trend, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; trend?: { value: number; label?: string }; className?: string }) {
  return (
    <Card className={cn("px-5 py-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900 tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-steel-500">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-md bg-ink-50 p-2 text-ink-700 [&_svg]:size-5">{icon}</div> : null}
      </div>
      {trend ? (
        <p className={cn("mt-2 text-xs font-medium", trend.value >= 0 ? "text-success-700" : "text-danger-700")}>
          {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}% {trend.label ?? ""}
        </p>
      ) : null}
    </Card>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-steel-300 bg-steel-50/50 px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-3 rounded-full bg-white p-3 text-steel-400 shadow-card [&_svg]:size-6">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-steel-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Alert({ variant = "info", title, children, className }: { variant?: "info" | "success" | "warning" | "danger"; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const styles = {
    info: "border-info-100 bg-info-50 text-info-700",
    success: "border-success-100 bg-success-50 text-success-700",
    warning: "border-warning-100 bg-warning-50 text-warning-700",
    danger: "border-danger-100 bg-danger-50 text-danger-700",
  }[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", styles, className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-steel-100", className)} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-steel-200", className)} />;
}

/** Definition list in a responsive grid: [{label, value}] */
export function DataList({ items, columns = 2, className }: { items: Array<{ label: React.ReactNode; value: React.ReactNode }>; columns?: 1 | 2 | 3 | 4; className?: string }) {
  const cols = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[columns];
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3", cols, className)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-steel-500">{it.label}</dt>
          <dd className="mt-0.5 text-sm text-ink-900 break-words">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
