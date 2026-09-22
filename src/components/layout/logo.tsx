import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** CANG wordmark: geometric mark (stylised "C" gantry/crane frame) + wordmark. */
export function Logo({ className, dark, size = "md", href = "/" }: { className?: string; dark?: boolean; size?: "sm" | "md" | "lg"; href?: string | null }) {
  const h = { sm: 22, md: 28, lg: 36 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  const inner = (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold tracking-[0.12em]", dark ? "text-white" : "text-ink-900", text, className)}>
      <LogoMark size={h} dark={dark} />
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

export function LogoMark({ size = 28, dark }: { size?: number; dark?: boolean }) {
  const fg = dark ? "#ffffff" : "#0f1b2d";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill={fg} />
      <path d="M22.5 11.2c-1.4-1.6-3.4-2.5-5.7-2.5-4.3 0-7.3 3.1-7.3 7.3s3 7.3 7.3 7.3c2.3 0 4.3-.9 5.7-2.5" stroke="#d4941a" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="23.2" cy="16" r="2.1" fill="#d4941a" />
    </svg>
  );
}
