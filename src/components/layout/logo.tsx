import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * CANG wordmark. "Cảng" is Vietnamese for port, so the mark is the letter C drawn as a harbour
 * basin with a vessel standing off the entrance. It is built on a 48-unit grid and stays legible
 * down to favicon size.
 */
export function Logo({ className, dark, size = "md", href = "/" }: { className?: string; dark?: boolean; size?: "sm" | "md" | "lg"; href?: string | null }) {
  const h = { sm: 22, md: 28, lg: 36 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  const inner = (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-[-0.03em]", dark ? "text-white" : "text-ink-900", text, className)}>
      <LogoMark size={h} />
      <span>CANG</span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="CANG home" className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={cn("text-brand-500", className)}>
      <path d="M35.49 14.36 A15 15 0 1 0 35.49 33.64" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <rect x="30" y="20.5" width="15" height="7" rx="3.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
