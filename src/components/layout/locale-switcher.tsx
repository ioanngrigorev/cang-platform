"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAMES: Record<string, string> = { en: "EN", vi: "VI" };

export function LocaleSwitcher({ className, dark }: { className?: string; dark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const search = useSearchParams();
  const change = (next: string) => {
    if (next === locale) return;
    const qs = search.toString();
    router.replace(
      // @ts-expect-error -- pathname + params are dynamic
      { pathname: qs ? `${pathname}?${qs}` : pathname, params },
      { locale: next },
    );
  };
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border px-1 py-0.5 text-xs font-semibold", dark ? "border-white/20 text-white/80" : "border-steel-200 text-steel-600", className)}>
      <Globe className="ml-1 size-3.5 opacity-70" />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          aria-pressed={l === locale}
          className={cn("rounded px-1.5 py-0.5 transition-colors", l === locale ? (dark ? "bg-white/15 text-white" : "bg-ink-900 text-white") : dark ? "hover:bg-white/10" : "hover:bg-steel-100")}
        >
          {NAMES[l]}
        </button>
      ))}
    </div>
  );
}
