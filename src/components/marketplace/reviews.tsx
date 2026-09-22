import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { Avatar, RatingStars } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, localized } from "@/lib/utils";
import type { ReviewSummary, SupplierReview } from "@/modules/catalog/queries";
import { countryName } from "./labels";

export function RatingDistribution({ summary, starLabel, className }: { summary: ReviewSummary; starLabel: (n: number) => string; className?: string }) {
  const max = Math.max(1, ...Object.values(summary.distribution));
  return (
    <ul className={cn("space-y-1.5", className)}>
      {[5, 4, 3, 2, 1].map((n) => {
        const count = summary.distribution[n as 1 | 2 | 3 | 4 | 5];
        const pct = summary.count ? Math.round((count / summary.count) * 100) : 0;
        return (
          <li key={n} className="flex items-center gap-2 text-xs text-steel-600">
            <span className="w-12 shrink-0 tabular-nums">{starLabel(n)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-steel-100">
              <span className="block h-full rounded-full bg-brass-400" style={{ width: `${(count / max) * 100}%` }} />
            </span>
            <span className="w-10 shrink-0 text-right tabular-nums">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

export function DimensionRatings({ summary, labels, className }: { summary: ReviewSummary; labels: Record<keyof ReviewSummary["dimensions"], string>; className?: string }) {
  const entries = Object.entries(summary.dimensions) as Array<[keyof ReviewSummary["dimensions"], number]>;
  return (
    <ul className={cn("grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2", className)}>
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-steel-600">{labels[k]}</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-steel-100">
              <span className="block h-full rounded-full bg-ink-800" style={{ width: `${(v / 5) * 100}%` }} />
            </span>
            <span className="w-7 text-right font-medium tabular-nums text-ink-900">{v.toFixed(1)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ReviewCard({ review, locale, labels }: { review: SupplierReview; locale: string; labels: { verified: string; replyFrom: string; buyerFrom: string; about: string; anonymous: string } }) {
  const author = review.authorCompany;
  const country = countryName(author?.countryCode, locale);
  return (
    <article className="rounded-lg border border-steel-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar name={author?.name ?? labels.anonymous} src={author?.logoUrl} size={40} square />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink-900">{author?.name ?? labels.anonymous}</span>
            {country ? <span className="text-xs text-steel-500">{labels.buyerFrom.replace("{country}", country)}</span> : null}
            {review.isVerifiedPurchase ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">
                <BadgeCheck className="size-3" /> {labels.verified}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel-500">
            <RatingStars value={review.ratingOverall} />
            <time dateTime={(review.publishedAt ?? review.createdAt).toISOString()}>{formatDate(review.publishedAt ?? review.createdAt, locale)}</time>
          </div>
        </div>
      </div>
      {review.title ? <h4 className="mt-3 text-base font-semibold">{review.title}</h4> : null}
      {review.body ? <p className="mt-1.5 text-sm leading-relaxed text-steel-700">{review.body}</p> : null}
      {review.product ? (
        <p className="mt-2 text-xs text-steel-500">
          {labels.about.replace("{product}", "")}
          <Link href={`/product/${review.product.slug}`} className="font-medium text-ink-700 hover:underline">
            {localized(review.product as unknown as Record<string, unknown>, "title", locale)}
          </Link>
        </p>
      ) : null}
      {review.reply ? (
        <div className="mt-4 rounded-md border-l-2 border-brass-400 bg-steel-50 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-800">
            <MessageSquareReply className="size-3.5" /> {labels.replyFrom}
            {review.repliedAt ? <span className="font-normal text-steel-500">· {formatDate(review.repliedAt, locale)}</span> : null}
          </p>
          <p className="text-steel-700">{review.reply}</p>
        </div>
      ) : null}
    </article>
  );
}
