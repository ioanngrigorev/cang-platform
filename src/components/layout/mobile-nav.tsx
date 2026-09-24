"use client";

import { X } from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";

export function MobileNav({ links, trigger, cta }: { links: Array<{ key: string; href: string; label: string }>; trigger: React.ReactNode; cta: { href: string; label: string } }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="lg:hidden">
        {trigger}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col bg-white shadow-panel animate-fade-in">
            <div className="flex items-center justify-between border-b border-steel-200 px-4 py-3">
              <Logo href={null} />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-steel-600 hover:bg-steel-100" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {links.map((l) => (
                <Link key={l.key} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-base font-medium text-ink-900 hover:bg-steel-100">
                  {l.label}
                </Link>
              ))}
              <Link href={cta.href} onClick={() => setOpen(false)} className="mt-2 block rounded-md bg-brass-50 px-3 py-2.5 text-base font-semibold text-brass-800">
                {cta.label} →
              </Link>
            </nav>
            <div className="border-t border-steel-200 px-4 py-3">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
