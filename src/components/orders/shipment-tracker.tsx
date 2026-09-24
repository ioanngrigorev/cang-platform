import { AlertTriangle, Check } from "lucide-react";
import * as React from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { ALERT_STATUSES, FLOWS, flowFor, type ShipmentStatus } from "@/modules/logistics/tracking/statuses";

export type ShipmentEventRow = { id: string; milestone: string; status: string; location: string | null; description: string | null; occurredAt: Date | string };

/**
 * Progress along the shipment's flow (parcel / truckload / freight, picked by mode). Steps reached are
 * ticked; a failure or hold is shown on the step where it happened. `labels` = tracking.status.* messages.
 */
export function ShipmentStepper({
  status,
  mode,
  events,
  locale,
  labels,
  orientation = "vertical",
}: {
  status: string;
  mode?: string | null;
  events: ShipmentEventRow[];
  locale: string;
  labels: Record<string, string>;
  orientation?: "vertical" | "horizontal";
}) {
  const flow = FLOWS[flowFor(mode)];
  const history = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  let reached = -1;
  for (const e of history) reached = Math.max(reached, flow.indexOf(e.status as ShipmentStatus));
  reached = Math.max(reached, flow.indexOf(status as ShipmentStatus));
  if (status === "DELIVERED") reached = flow.length - 1;
  const problem = ALERT_STATUSES.has(status as ShipmentStatus) || status === "CANCELLED";
  const firstByStatus = new Map<string, ShipmentEventRow>();
  for (const e of history) if (!firstByStatus.has(e.status)) firstByStatus.set(e.status, e);

  if (orientation === "horizontal") {
    return (
      <div>
        <ol className="flex w-full items-start gap-1 overflow-x-auto pb-1">
          {flow.map((s, i) => {
            const done = i <= reached;
            const blocked = problem && i === reached + 1;
            return (
              <li key={s} className="flex min-w-[76px] flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-success-500" : "bg-steel-200")} />
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", done ? "bg-brand-500 text-on-brand" : blocked ? "bg-warning-100 text-warning-700 ring-1 ring-warning-500" : "bg-steel-200 text-steel-500")}>
                    {done ? <Check className="size-3.5" /> : blocked ? <AlertTriangle className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cn("h-0.5 flex-1", i === flow.length - 1 ? "bg-transparent" : i < reached ? "bg-success-500" : "bg-steel-200")} />
                </div>
                <span className={cn("mt-1.5 text-[11px] leading-tight", done ? "font-medium text-ink-900" : "text-steel-500")}>{labels[s] ?? s}</span>
              </li>
            );
          })}
        </ol>
        {problem ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-warning-50 px-2 py-1 text-xs font-medium text-warning-700">
            <AlertTriangle className="size-3.5" /> {labels[status] ?? status}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {flow.map((s, i) => {
        const done = i <= reached;
        const blocked = problem && i === reached + 1;
        const event = firstByStatus.get(s);
        const isLast = i === flow.length - 1;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? <span className={cn("absolute left-[11px] top-6 h-full w-px", i < reached ? "bg-success-500" : "bg-steel-200")} aria-hidden /> : null}
            <span className={cn("relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", done ? "bg-brand-500 text-on-brand" : blocked ? "bg-warning-100 text-warning-700 ring-1 ring-warning-500" : "bg-steel-200 text-steel-500")}>
              {done ? <Check className="size-3.5" /> : blocked ? <AlertTriangle className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", done ? "font-medium text-ink-900" : "text-steel-500")}>{labels[s] ?? s}</p>
              {blocked ? <p className="mt-0.5 text-xs font-medium text-warning-700">{labels[status] ?? status}</p> : null}
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
