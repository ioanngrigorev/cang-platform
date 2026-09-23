import { cva, type VariantProps } from "class-variance-authority";
import { BadgeCheck, Factory, Globe2, ShieldCheck, Star, Zap } from "lucide-react";
import * as React from "react";
import { cn, humanize } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    variant: {
      neutral: "border-steel-200 bg-steel-50 text-steel-700",
      ink: "border-hairline bg-surface/70 text-ink-700 backdrop-blur-sm",
      brass: "border-brass-300 bg-brass-50 text-brass-800",
      success: "border-success-100 bg-success-50 text-success-700",
      warning: "border-warning-100 bg-warning-50 text-warning-700",
      danger: "border-danger-100 bg-danger-50 text-danger-700",
      info: "border-info-100 bg-info-50 text-info-700",
      outline: "border-steel-300 bg-transparent text-steel-700",
    },
    size: { sm: "text-[11px] px-1.5 py-0", md: "text-xs px-2 py-0.5", lg: "text-sm px-2.5 py-1" },
  },
  defaultVariants: { variant: "neutral", size: "md" },
});

export function Badge({ className, variant, size, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/** Maps any status-ish code to a badge colour. Extend as needed; unknown codes are neutral. */
const STATUS_VARIANTS: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  ACTIVE: "success",
  VERIFIED: "success",
  PUBLISHED: "success",
  COMPLETED: "success",
  PAID: "success",
  SETTLED: "success",
  RELEASED: "success",
  DELIVERED: "success",
  DELIVERY: "success",
  ACCEPTED: "success",
  FUNDED: "success",
  CLEARED: "success",
  PASS: "success",
  OPEN: "info",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  IN_REVIEW: "info",
  PRODUCTION: "info",
  IN_TRANSIT: "info",
  SHIPPING: "brass",
  QUALITY_INSPECTION: "info",
  BOOKED: "info",
  OFFERED: "brass",
  REVISED: "brass",
  PENDING: "warning",
  PENDING_REVIEW: "warning",
  PENDING_VERIFICATION: "warning",
  PAYMENT: "warning",
  AWAITING_RESPONSE: "warning",
  PURCHASE_ORDER: "neutral",
  DRAFT: "neutral",
  CREATED: "neutral",
  INACTIVE: "neutral",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
  UNVERIFIED: "neutral",
  NOT_APPLICABLE: "neutral",
  EXPIRED: "neutral",
  WITHDRAWN: "neutral",
  CANCELLED: "neutral",
  REJECTED: "danger",
  FAILED: "danger",
  DISPUTED: "danger",
  SUSPENDED: "danger",
  BANNED: "danger",
  FLAGGED: "danger",
  DECLINED: "danger",
  FAIL: "danger",
  HELD: "brass",
  AWARDED: "success",
};

export function StatusBadge({ status, label, className, size }: { status: string | null | undefined; label?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  if (!status) return null;
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "neutral"} size={size} className={className}>
      {label ?? humanize(status)}
    </Badge>
  );
}

const TRUST_BADGES: Record<string, { icon: React.ComponentType<{ className?: string }>; variant: VariantProps<typeof badgeVariants>["variant"]; label: string }> = {
  VERIFIED_MANUFACTURER: { icon: BadgeCheck, variant: "success", label: "Verified Manufacturer" },
  FACTORY_AUDITED: { icon: Factory, variant: "ink", label: "Factory Audited" },
  EXPORT_READY: { icon: Globe2, variant: "info", label: "Export Ready" },
  FAST_RESPONSE: { icon: Zap, variant: "brass", label: "Fast Response" },
  TOP_SUPPLIER: { icon: Star, variant: "brass", label: "Top Supplier" },
  TRADE_ASSURANCE: { icon: ShieldCheck, variant: "success", label: "Trade Assurance" },
};

/** Renders supplier trust badges from badge codes (labels overridable, e.g. localized names from DB). */
export function TrustBadges({ codes, labels, size = "md", max, className }: { codes: string[]; labels?: Record<string, string>; size?: "sm" | "md" | "lg"; max?: number; className?: string }) {
  const list = (max ? codes.slice(0, max) : codes).filter((c) => TRUST_BADGES[c]);
  if (!list.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {list.map((code) => {
        const def = TRUST_BADGES[code];
        const Icon = def.icon;
        return (
          <Badge key={code} variant={def.variant} size={size}>
            <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
            {labels?.[code] ?? def.label}
          </Badge>
        );
      })}
    </div>
  );
}

export function VerifiedMark({ status, className }: { status: string; className?: string }) {
  if (status !== "VERIFIED") return null;
  return <BadgeCheck className={cn("size-4 text-success-600", className)} aria-label="Verified" />;
}
