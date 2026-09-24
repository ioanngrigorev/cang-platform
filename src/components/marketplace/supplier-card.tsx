import { Building2, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, TrustBadges, VerifiedMark } from "@/components/ui/badge";
import { Avatar, RatingStars } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { cn, employeeRangeLabel, humanize, localized } from "@/lib/utils";

export type SupplierCardData = {
  id: string;
  slug: string;
  name: string;
  nameVi?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  businessType: string;
  verificationStatus: string;
  ratingAvg: number;
  ratingCount: number;
  yearEstablished?: number | null;
  employeeRange?: string | null;
  provinceName?: string | null;
  city?: string | null;
  countryCode: string;
  oemCapable?: boolean;
  odmCapable?: boolean;
  avgLeadTimeDays?: number | null;
  exportCountries?: string[];
  productCount?: number;
  badgeCodes?: string[];
  certificationCodes?: string[];
  responseRate?: number | null;
  isFeatured?: boolean;
};

export function SupplierCard({
  supplier,
  locale,
  labels,
  className,
  variant = "grid",
}: {
  supplier: SupplierCardData;
  locale: string;
  labels: { products: string; established: string; employees: string; leadTime: string; days: string; oem: string; odm: string; responseRate: string; exportMarkets: string; view: string };
  className?: string;
  variant?: "grid" | "row";
}) {
  const name = localized(supplier as unknown as Record<string, unknown>, "name", locale);
  const meta = [
    supplier.yearEstablished ? `${labels.established} ${supplier.yearEstablished}` : null,
    supplier.employeeRange ? `${employeeRangeLabel(supplier.employeeRange)} ${labels.employees}` : null,
    supplier.avgLeadTimeDays ? `${labels.leadTime} ${labels.days.replace("{count}", String(supplier.avgLeadTimeDays))}` : null,
  ].filter(Boolean);
  const location = [supplier.city, supplier.provinceName].filter(Boolean).join(", ") || (supplier.countryCode === "VN" ? "Vietnam" : supplier.countryCode);

  return (
    <article className={cn("group overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", variant === "row" && "sm:flex", className)}>
      <Link href={`/supplier/${supplier.slug}`} className={cn("relative block bg-steel-100", variant === "row" ? "aspect-[16/9] sm:aspect-auto sm:w-56 sm:shrink-0" : "aspect-[16/7]")}>
        <SmartImage src={supplier.coverUrl ?? undefined} alt={name} fill photo={supplier.tagline ?? false} fallbackLabel={name} />
        {supplier.isFeatured ? (
          <Badge variant="brass" size="sm" className="absolute left-2 top-2">
            Featured
          </Badge>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <Avatar name={name} src={supplier.logoUrl} size={44} square className="border border-steel-200 bg-white" />
          <div className="min-w-0 flex-1">
            <Link href={`/supplier/${supplier.slug}`} className="flex items-center gap-1.5">
              <span className="truncate text-base font-semibold text-ink-900 group-hover:underline">{name}</span>
              <VerifiedMark status={supplier.verificationStatus} />
            </Link>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-steel-500">
              <Building2 className="size-3" /> {humanize(supplier.businessType)}
              <span className="text-steel-300">·</span>
              <MapPin className="size-3" /> {location}
            </p>
          </div>
        </div>
        {supplier.tagline ? <p className="mt-3 line-clamp-2 text-sm text-steel-600">{supplier.tagline}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel-500">
          <RatingStars value={supplier.ratingAvg} count={supplier.ratingCount} />
          {supplier.productCount != null ? (
            <span>
              <span className="font-medium text-steel-700">{supplier.productCount}</span> {labels.products}
            </span>
          ) : null}
          {supplier.responseRate != null ? (
            <span>
              {labels.responseRate} <span className="font-medium text-steel-700">{Math.round(supplier.responseRate)}%</span>
            </span>
          ) : null}
        </div>
        {meta.length ? <p className="mt-1.5 text-xs text-steel-500">{meta.join(" · ")}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {supplier.badgeCodes?.length ? <TrustBadges codes={supplier.badgeCodes} size="sm" max={3} /> : null}
          {supplier.oemCapable ? (
            <Badge variant="outline" size="sm">
              {labels.oem}
            </Badge>
          ) : null}
          {supplier.odmCapable ? (
            <Badge variant="outline" size="sm">
              {labels.odm}
            </Badge>
          ) : null}
          {supplier.certificationCodes?.slice(0, 3).map((c) => (
            <Badge key={c} variant="neutral" size="sm">
              {c.replace(/_/g, "-")}
            </Badge>
          ))}
        </div>
        {supplier.exportCountries?.length ? (
          <p className="mt-2 text-[11px] text-steel-500">
            {labels.exportMarkets}: {supplier.exportCountries.slice(0, 6).join(", ")}
            {supplier.exportCountries.length > 6 ? ` +${supplier.exportCountries.length - 6}` : ""}
          </p>
        ) : null}
        <div className="mt-auto pt-3">
          <Link href={`/supplier/${supplier.slug}`} className="text-sm font-medium text-ink-700 hover:text-ink-900 hover:underline">
            {labels.view} →
          </Link>
        </div>
      </div>
    </article>
  );
}
