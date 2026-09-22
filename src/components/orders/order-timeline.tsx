import { AlertTriangle, ClipboardCheck, CreditCard, FileText, Package, ShieldAlert, StickyNote, Truck } from "lucide-react";
import * as React from "react";
import { cn, formatDateTime } from "@/lib/utils";

export type TimelineEvent = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  title: string;
  description: string | null;
  createdAt: Date | string;
  actor?: { id: string; name: string } | null;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  STATUS_CHANGE: Package,
  PAYMENT: CreditCard,
  SHIPMENT: Truck,
  DOCUMENT: FileText,
  INSPECTION: ClipboardCheck,
  DISPUTE: ShieldAlert,
  NOTE: StickyNote,
  SYSTEM: AlertTriangle,
};

const TONES: Record<string, string> = {
  PAYMENT: "bg-success-50 text-success-700 ring-success-100",
  SHIPMENT: "bg-brass-50 text-brass-700 ring-brass-200",
  DISPUTE: "bg-danger-50 text-danger-700 ring-danger-100",
  INSPECTION: "bg-info-50 text-info-700 ring-info-100",
};

/** Vertical order timeline built from order_events (server component — no interactivity needed). */
export function OrderTimeline({ events, locale, emptyLabel }: { events: TimelineEvent[]; locale: string; emptyLabel: string }) {
  if (!events.length) return <p className="text-sm text-steel-500">{emptyLabel}</p>;
  return (
    <ol className="relative space-y-5 pl-1">
      {events.map((e, i) => {
        const Icon = ICONS[e.type] ?? Package;
        return (
          <li key={e.id} className="relative flex gap-3">
            {i < events.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-steel-200" aria-hidden /> : null}
            <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 [&_svg]:size-4", TONES[e.type] ?? "bg-steel-100 text-steel-600 ring-steel-200")}>
              <Icon />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium text-ink-900">{e.title}</p>
              {e.description ? <p className="mt-0.5 text-sm text-steel-600">{e.description}</p> : null}
              <p className="mt-0.5 text-xs text-steel-500">
                {formatDateTime(e.createdAt, locale)}
                {e.actor?.name ? ` · ${e.actor.name}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
