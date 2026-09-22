import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brass-500/20 blur-3xl" />
        <Logo dark size="lg" />
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400">Source from Vietnam</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white">{t("tagline")}</h2>
          <ul className="mt-8 space-y-3 text-sm text-steel-300">
            <li className="flex gap-3"><span className="text-brass-400">●</span> Verified factories with audited capacity and certifications</li>
            <li className="flex gap-3"><span className="text-brass-400">●</span> RFQ marketplace with side-by-side quotation comparison</li>
            <li className="flex gap-3"><span className="text-brass-400">●</span> Trade Assurance, inspection, logistics and financing partners</li>
          </ul>
        </div>
        <p className="relative text-xs text-steel-500">cang.vn · Vietnam&apos;s digital infrastructure for global B2B trade</p>
      </aside>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:justify-end">
          <span className="lg:hidden"><Logo /></span>
          <div className="flex items-center gap-3 text-sm">
            <LocaleSwitcher />
            <Link href="/" className="text-steel-500 hover:text-ink-900">← cang.vn</Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
