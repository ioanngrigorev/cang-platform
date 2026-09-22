import { Check } from "lucide-react";
import * as React from "react";
import { cn, formatDateTime } from "@/lib/utils";

/** Canonical milestone chain shown on every shipment (shipment_events.milestone). */
export const SHIPMENT_MILESTONES = ["FACTORY", "PICKUP", "WAREHOUSE", "ORIGIN_PORT", "DEPARTED", "IN_TRANSIT", "DESTINATION_PORT", "CUSTOMS", "LAST_MILE", "DELIVERED"] as const;
export type ShipmentMilestone = (typeof SHIPMENT_MILESTONES)[number];

/** Map a shipment status onto the furthest milestone it implies (for shipments without events). */
const STATUS_TO_MILESTONE: Record<string, ShipmentMilestone> = {
  PENDING: "FACTORY",
  BOOKED: "FACTORY",
  PICKED_UP: "PICKUP",
  AT_WAREHOUSE: "WAREHOUSE",
  AT_ORIGIN_PORT: "ORIGIN_PORT",
  DEPARTED: "DEPARTED",
  IN_TRANSIT: "IN_TRANSIT",
  AT_DESTINATION_PORT: "DESTINATION_PORT",
  CUSTOMS_CLEARANCE: "CUSTOMS",
  OUT_FOR_DELIVERY: "LAST_MILE",
  DELIVERED: "DELIVERED",
};

export type ShipmentEventRow = { id: string; milestone: string; status: string; location: string | null; description: string | null; occurredAt: Date | string };

export function ShipmentStepper({
  status,
  events,
  locale,
  labels,
  orientation = "vertical",
}: {
  status: string;
  events: ShipmentEventRow[];
  locale: string;
  labels: Record<string, string>;
  orientation?: "vertical" | "horizontal";
}) {
  const reached = new Set(events.map((e) => e.milestone));
  const fallback = STATUS_TO_MILESTONE[status];
  if (fallback) {
    const upTo = SHIPMENT_MILESTONES.indexOf(fallback);
    SHIPMENT_MILESTONES.slice(0, upTo + 1).forEach((m) => reached.add(m));
  }
  const lastReachedIndex = SHIPMENT_MILESTONES.reduce((acc, m, i) => (reached.has(m) ? i : acc), -1);

  if (orientation === "horizontal") {
    return (
      <ol className="flex w-full items-start gap-1 overflow-x-auto pb-1">
        {SHIPMENT_MILESTONES.map((m, i) => {
          const done = i <= lastReachedIndex;
          return (
            <li key={m} className="flex min-w-[76px] flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-success-500" : "bg-steel-200")} />
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", done ? "bg-success-500 text-white" : "bg-steel-200 text-steel-500")}>
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("h-0.5 flex-1", i === SHIPMENT_MILESTONES.length - 1 ? "bg-transparent" : i < lastReachedIndex ? "bg-success-500" : "bg-steel-200")} />
              </div>
              <span className={cn("mt-1.5 text-[11px] leading-tight", done ? "font-medium text-ink-900" : "text-steel-500")}>{labels[m] ?? m}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  const eventsByMilestone = new Map<string, ShipmentEventRow>();
  for (const e of events) if (!eventsByMilestone.has(e.milestone)) eventsByMilestone.set(e.milestone, e);

  return (
    <ol className="space-y-0">
      {SHIPMENT_MILESTONES.map((m, i) => {
        const done = i <= lastReachedIndex;
        const event = eventsByMilestone.get(m);
        const isLast = i === SHIPMENT_MILESTONES.length - 1;
        return (
          <li key={m} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? <span className={cn("absolute left-[11px] top-6 h-full w-px", i < lastReachedIndex ? "bg-success-400" : "bg-steel-200")} aria-hidden /> : null}
            <span className={cn("relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", done ? "bg-success-500 text-white" : "bg-steel-200 text-steel-500")}>
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", done ? "font-medium text-ink-900" : "text-steel-500")}>{labels[m] ?? m}</p>
              {event ? (
                <p className="mt-0.5 text-xs text-steel-500">
                  {formatDateTime(event.occurredAt, locale)}
                  {event.location ? ` · ${event.location}` : ""}
                  {event.description ? ` · ${event.description}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
