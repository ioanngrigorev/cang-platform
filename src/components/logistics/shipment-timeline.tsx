import { FileText, ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { statusTone } from "@/modules/logistics/tracking/statuses";

export type TimelineItem = {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  source: string;
  reasonCode: string | null;
  attachments: Array<{ url: string; name: string; kind?: string }> | null;
  data: Record<string, unknown> | null;
  occurredAt: Date | string;
  actorName?: string | null;
  actorCompany?: string | null;
};

export const STATUS_BADGE: Record<ReturnType<typeof statusTone>, "success" | "danger" | "warning" | "info" | "neutral"> = { success: "success", danger: "danger", warning: "warning", info: "info", steel: "neutral" };

/** Full tracking history (newest first) with who reported each step, reasons, POD and files. */
export async function ShipmentTimeline({ events, locale, className }: { events: TimelineItem[]; locale: string; className?: string }) {
  const t = await getTranslations("tracking");
  if (!events.length) return <p className={cn("text-sm text-steel-500", className)}>{t("timeline.empty")}</p>;
  return (
    <ol className={cn("space-y-4", className)}>
      {events.map((e) => {
        const d = e.data ?? {};
        const receiver = typeof d.receiverName === "string" ? d.receiverName : null;
        const plate = typeof d.vehiclePlate === "string" ? d.vehiclePlate : null;
        const packages = typeof d.packages === "number" ? d.packages : null;
        const weight = typeof d.grossWeightKg === "number" ? d.grossWeightKg : null;
        const who = e.actorName ? `${e.actorName}${e.actorCompany ? ` · ${e.actorCompany}` : ""}` : null;
        return (
          <li key={e.id} className="relative border-l-2 border-steel-200 pl-4">
            <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-steel-400" aria-hidden />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE[statusTone(e.status)]} size="sm">
                {t.has(`status.${e.status}`) ? t(`status.${e.status}`) : e.status}
              </Badge>
              <span className="text-xs text-steel-500">{formatDateTime(e.occurredAt, locale)}</span>
              <span className="text-xs text-steel-400">· {t.has(`sources.${e.source}`) ? t(`sources.${e.source}`) : e.source}</span>
              {who ? <span className="text-xs text-steel-400">{t("timeline.by", { name: who })}</span> : null}
            </div>
            {e.location || e.description ? <p className="mt-1 text-sm text-ink-900">{[e.location, e.description].filter(Boolean).join(" · ")}</p> : null}
            {e.reasonCode ? <p className="mt-0.5 text-xs font-medium text-warning-700">{t("timeline.reason", { reason: t.has(`reasons.${e.reasonCode}`) ? t(`reasons.${e.reasonCode}`) : e.reasonCode })}</p> : null}
            {receiver ? <p className="mt-0.5 text-xs text-steel-600">{t("timeline.receiver", { name: receiver })}</p> : null}
            {plate ? <p className="mt-0.5 text-xs text-steel-600">{t("timeline.vehicle", { plate })}{typeof d.driverName === "string" ? ` · ${d.driverName}` : ""}</p> : null}
            {packages != null || weight != null ? <p className="mt-0.5 text-xs text-steel-600">{t("timeline.measured", { packages: packages ?? "—", weight: weight ?? "—" })}</p> : null}
            {e.attachments?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {e.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-steel-200 bg-white px-2 py-1 text-xs text-steel-700 hover:border-steel-400">
                    {a.kind === "POD" || a.kind === "PHOTO" ? <ImageIcon className="size-3.5" /> : <FileText className="size-3.5" />}
                    {a.kind === "POD" ? t("timeline.pod") : a.name}
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
