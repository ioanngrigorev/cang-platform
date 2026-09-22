import { BadgeCheck, CalendarClock, Globe2, Package, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatMoney, formatNumber, localized, timeAgo } from "@/lib/utils";
import type { PublicRfqRow } from "@/modules/catalog/queries";
import { countryName } from "./labels";

export type RfqCardLabels = {
  quantity: string;
  destination: string;
  deadline: string;
  targetPrice: string;
  quotations: (count: number) => string;
  buyerFrom: (country: string) => string;
  verifiedBuyer: string;
  priority: string;
  view: string;
  notSpecified: string;
};

export function RfqCard({ rfq, locale, labels, className }: { rfq: PublicRfqRow; locale: string; labels: RfqCardLabels; className?: string }) {
  const buyerCountry = countryName(rfq.buyerCompany.countryCode, locale);
  const dest = rfq.destinationCountry ? localized(rfq.destinationCountry as unknown as Record<string, unknown>, "name", locale) : null;
  return (
    <article className={cn("flex flex-col rounded-lg border border-steel-200 bg-white p-5 shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-steel-500">
        <span className="font-mono">{rfq.rfqNumber}</span>
        {rfq.category ? (
          <>
            <span className="text-steel-300">·</span>
            <span>{localized(rfq.category as unknown as Record<string, unknown>, "name", locale)}</span>
          </>
        ) : null}
        {rfq.isPriority ? (
          <Badge variant="brass" size="sm" className="ml-auto">
            <Zap className="size-3" /> {labels.priority}
          </Badge>
        ) : null}
      </div>
      <Link href={`/rfq/${rfq.id}`} className="mt-2 line-clamp-2 text-base font-semibold text-ink-900 hover:underline">
        {rfq.title}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-steel-600">{rfq.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Package className="mt-0.5 size-4 shrink-0 text-steel-400" />
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-steel-500">{labels.quantity}</dt>
            <dd className="font-medium text-ink-900">
              {formatNumber(rfq.quantity, locale)} {rfq.unit}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe2 className="mt-0.5 size-4 shrink-0 text-steel-400" />
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-steel-500">{labels.destination}</dt>
            <dd className="font-medium text-ink-900">{dest ?? labels.notSpecified}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-steel-400" />
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-steel-500">{labels.deadline}</dt>
            <dd className="font-medium text-ink-900">{rfq.quoteDeadline ? formatDate(rfq.quoteDeadline, locale) : labels.notSpecified}</dd>
          </div>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-steel-500">{labels.targetPrice}</dt>
          <dd className="font-medium text-ink-900">{rfq.targetPrice != null ? formatMoney(rfq.targetPrice, rfq.targetCurrency, locale) : labels.notSpecified}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-steel-100 pt-3 text-xs text-steel-500">
        <span className="inline-flex items-center gap-1.5">
          {labels.buyerFrom(buyerCountry)}
          {rfq.buyerCompany.verificationStatus === "VERIFIED" ? (
            <span className="inline-flex items-center gap-0.5 text-success-700">
              <BadgeCheck className="size-3.5" /> {labels.verifiedBuyer}
            </span>
          ) : null}
        </span>
        <span>
          {labels.quotations(rfq.quotationCount)} · {rfq.publishedAt ? timeAgo(rfq.publishedAt, locale) : ""}
        </span>
      </div>
    </article>
  );
}
