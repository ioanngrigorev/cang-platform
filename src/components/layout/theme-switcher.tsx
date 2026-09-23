"use client";

import * as React from "react";
import { THEMES, THEME_COOKIE, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Jade or Lime. The choice is written to a cookie and applied to <html> straight away, so the
 * page repaints instantly and every later server render already agrees with what is on screen.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [active, setActive] = React.useState<ThemeId>("jade");

  React.useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "jade" || current === "lime") setActive(current);
  }, []);

  function choose(id: ThemeId) {
    setActive(id);
    document.documentElement.setAttribute("data-theme", id);
    document.documentElement.style.colorScheme = id === "lime" ? "dark" : "light";
    document.cookie = `${THEME_COOKIE}=${id};path=/;max-age=31536000;samesite=lax`;
  }

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-steel-200 p-0.5", className)} role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => choose(t.id)}
          aria-pressed={active === t.id}
          title={`${t.label} · ${t.labelVi}`}
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition",
            active === t.id ? "bg-steel-100" : "hover:bg-steel-50",
          )}
        >
          <span className="size-3 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: t.swatch }} />
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
