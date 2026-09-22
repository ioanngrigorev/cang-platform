import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, TrustBadges, VerifiedMark } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";
import { cn, formatMoney, formatNumber, localized } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  titleVi?: string | null;
  primaryImageUrl?: string | null;
  priceType: string;
  currency: string;
  basePrice?: number | null;
  minTierPrice?: number | null;
  maxTierPrice?: number | null;
  moq: number;
  unit: string;
  leadTimeDays?: number | null;
  oemAvailable?: boolean;
  odmAvailable?: boolean;
  isFeatured?: boolean;
  company: {
    slug: string;
    name: string;
    verificationStatus: string;
    provinceName?: string | null;
    countryCode?: string;
    badgeCodes?: string[];
  };
};

export function priceLabel(p: Pick<ProductCardData, "priceType" | "currency" | "basePrice" | "minTierPrice" | "maxTierPrice">, locale: string, t: { contact: string; negotiable: string }) {
  if (p.priceType === "CONTACT") return t.contact;
  if (p.priceType === "NEGOTIABLE" && p.basePrice == null && p.minTierPrice == null) return t.negotiable;
  const low = p.minTierPrice ?? p.basePrice;
  const high = p.maxTierPrice ?? p.basePrice;
  if (low == null) return t.contact;
  if (high != null && high !== low) return `${formatMoney(low, p.currency, locale)} – ${formatMoney(high, p.currency, locale)}`;
  return formatMoney(low, p.currency, locale);
}

/** Product tile used in listings, search, supplier profile and homepage. */
export function ProductCard({
  product,
  locale,
  labels,
  className,
  compact,
}: {
  product: ProductCardData;
  locale: string;
  labels: { moq: string; leadTime: string; days: string; contact: string; negotiable: string; oem: string; odm: string; perUnit: string };
  className?: string;
  compact?: boolean;
}) {
  const title = localized(product as unknown as Record<string, unknown>, "title", locale);
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", className)}>
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-steel-50">
        <SmartImage src={product.primaryImageUrl ?? undefined} alt={title} fill fallbackLabel={title} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {product.isFeatured ? (
          <Badge variant="brass" size="sm" className="absolute left-2 top-2 shadow-sm">
            Featured
          </Badge>
        ) : null}
        {product.oemAvailable || product.odmAvailable ? (
          <div className="absolute right-2 top-2 flex gap-1">
            {product.oemAvailable ? (
              <Badge variant="ink" size="sm">
                {labels.oem}
              </Badge>
            ) : null}
            {product.odmAvailable ? (
              <Badge variant="ink" size="sm">
                {labels.odm}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-medium text-ink-900 hover:underline">
          {title}
        </Link>
        <p className="mt-2 font-display text-base font-semibold text-ink-900">
          {priceLabel(product, locale, labels)}
          {product.priceType !== "CONTACT" && (product.basePrice != null || product.minTierPrice != null) ? <span className="ml-1 text-xs font-normal text-steel-500">{labels.perUnit.replace("{unit}", product.unit)}</span> : null}
        </p>
        <p className="mt-1 text-xs text-steel-500">
          {labels.moq}: <span className="font-medium text-steel-700">{formatNumber(product.moq, locale)} {product.unit}</span>
          {!compact && product.leadTimeDays ? (
            <>
              {" · "}
              {labels.leadTime}: <span className="font-medium text-steel-700">{labels.days.replace("{count}", String(product.leadTimeDays))}</span>
            </>
          ) : null}
        </p>
        <div className="mt-auto pt-3">
          <Link href={`/supplier/${product.company.slug}`} className="flex items-center gap-1.5 text-xs text-steel-600 hover:text-ink-900">
            <span className="truncate font-medium">{product.company.name}</span>
            <VerifiedMark status={product.company.verificationStatus} className="size-3.5" />
          </Link>
          {product.company.provinceName ? (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-steel-500">
              <MapPin className="size-3" /> {product.company.provinceName}, {product.company.countryCode === "VN" ? "Vietnam" : product.company.countryCode}
            </p>
          ) : null}
          {!compact && product.company.badgeCodes?.length ? <TrustBadges codes={product.company.badgeCodes} size="sm" max={2} className="mt-2" /> : null}
        </div>
      </div>
    </article>
  );
}
