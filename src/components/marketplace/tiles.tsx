import {
  Armchair,
  Bike,
  Box,
  BrickWall,
  Briefcase,
  Car,
  CircleDot,
  Cog,
  Cpu,
  Factory,
  Feather,
  FlaskConical,
  Footprints,
  Home,
  Layers,
  MapPin,
  Package,
  Settings2,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
  type LucideProps,
} from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Shirt,
  Layers,
  Footprints,
  Armchair,
  Cpu,
  Zap,
  Cog,
  Factory,
  Car,
  Bike,
  Box,
  CircleDot,
  Package,
  BrickWall,
  Wheat,
  UtensilsCrossed,
  Home,
  Sparkles,
  FlaskConical,
  Wrench,
  Settings2,
  Feather,
  Warehouse,
  Briefcase,
};

/** Renders the lucide icon named in `industries.icon` (falls back to a factory). */
export function IndustryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]) || Factory;
  return <Icon className={className} aria-hidden />;
}

export function CategoryTile({ href, name, imageUrl, count, countLabel, className }: { href: string; name: string; imageUrl?: string | null; count?: number; countLabel?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex flex-col overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", className)}>
      <div className="relative aspect-[4/3] overflow-hidden bg-steel-100">
        <SmartImage src={imageUrl ?? undefined} alt={name} fill photo fallbackLabel={name} className="transition-transform duration-300 group-hover:scale-[1.04]" />
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-ink-900 group-hover:underline">{name}</p>
        {countLabel ? <p className="mt-0.5 text-xs text-steel-500">{countLabel}</p> : count != null ? <p className="mt-0.5 text-xs text-steel-500">{count}</p> : null}
      </div>
    </Link>
  );
}

export function IndustryTile({ href, name, icon, countLabel, description, className, compact }: { href: string; name: string; icon?: string | null; countLabel?: string; description?: string | null; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group flex items-start gap-3 rounded-lg border border-steel-200 bg-white p-4 shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-ink-50 text-ink-800 group-hover:bg-brass-50 group-hover:text-brass-700">
        <IndustryIcon name={icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink-900 group-hover:underline">{name}</span>
        {countLabel ? <span className="block text-xs text-steel-500">{countLabel}</span> : null}
        {!compact && description ? <span className="mt-1 line-clamp-2 block text-xs text-steel-500">{description}</span> : null}
      </span>
    </Link>
  );
}

export function ClusterCard({
  href,
  name,
  region,
  headline,
  imageUrl,
  supplierLabel,
  verifiedLabel,
  industries,
  cta,
  className,
}: {
  href: string;
  name: string;
  region?: string | null;
  headline?: string | null;
  imageUrl?: string | null;
  supplierLabel: string;
  verifiedLabel?: string;
  industries: string[];
  cta: string;
  className?: string;
}) {
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-lg border border-steel-200 bg-white shadow-card transition-shadow hover:border-steel-300 hover:shadow-card-hover", className)}>
      <Link href={href} className="relative block aspect-[16/8] overflow-hidden bg-ink-900">
        <SmartImage src={imageUrl ?? undefined} alt={name} fill fallbackLabel={name} className="opacity-90" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-4">
          <p className="flex items-center gap-1 text-xs font-medium text-brass-200">
            <MapPin className="size-3.5" /> {region}
          </p>
          <h3 className="font-display text-xl font-bold text-white">{name}</h3>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {headline ? <p className="line-clamp-2 text-sm text-steel-700">{headline}</p> : null}
        <p className="mt-2 text-xs text-steel-500">
          <span className="font-semibold text-ink-900">{supplierLabel}</span>
          {verifiedLabel ? <span> · {verifiedLabel}</span> : null}
        </p>
        {industries.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {industries.slice(0, 4).map((i) => (
              <span key={i} className="rounded-full bg-steel-100 px-2 py-0.5 text-[11px] font-medium text-steel-700">
                {i}
              </span>
            ))}
          </div>
        ) : null}
        <Link href={href} className="mt-auto pt-4 text-sm font-semibold text-ink-700 hover:text-ink-900 hover:underline">
          {cta} →
        </Link>
      </div>
    </article>
  );
}
