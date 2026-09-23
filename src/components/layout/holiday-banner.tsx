"use client";

import { X } from "lucide-react";
import * as React from "react";
import type { Holiday } from "@/lib/holidays";

/**
 * A thin band above the header on Vietnamese public holidays. Deliberately quiet: one line of
 * type on the brand colour, a motif drawn from the day itself, and a dismiss that sticks for
 * the rest of the session.
 */
export function HolidayBanner({ holiday, locale }: { holiday: Holiday; locale: string }) {
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(`cang_holiday_${holiday.id}`) === "off");
    } catch {
      setHidden(false);
    }
  }, [holiday.id]);

  if (hidden) return null;
  const greeting = locale === "vi" ? holiday.titleVi : holiday.title;
  const secondary = locale === "vi" ? holiday.title : holiday.titleVi;

  return (
    <div className="relative overflow-hidden bg-brand-500 text-on-brand">
      <Motif id={holiday.id} />
      <div className="container relative flex items-center justify-center gap-3 py-1.5 text-center">
        <p className="text-[13px] font-semibold tracking-tight">
          {greeting}
          <span className="ml-2 font-normal opacity-70">{secondary}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(`cang_holiday_${holiday.id}`, "off");
            } catch {
              /* private mode: dismissing simply does not persist */
            }
          }}
          aria-label="Dismiss"
          className="absolute right-0 rounded p-1 opacity-60 transition hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** A repeating motif behind the greeting, different for each holiday, kept under 12% opacity. */
function Motif({ id }: { id: Holiday["id"] }) {
  const shape =
    id === "tet"
      ? // apricot blossom — five petals
        `<g fill="%23000">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="14" cy="7" rx="3.4" ry="5.2" transform="rotate(${a} 14 14)"/>`).join("")}<circle cx="14" cy="14" r="2"/></g>`
      : id === "national" || id === "hungkings"
        ? // five-pointed star
          `<path d="M14 5 16.5 11.5 23.5 11.5 18 15.6 20 22 14 18 8 22 10 15.6 4.5 11.5 11.5 11.5z" fill="%23000"/>`
        : id === "labour"
          ? // gear tooth ring
            `<g fill="%23000"><circle cx="14" cy="14" r="5.5"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="12.6" y="2" width="2.8" height="4.5" rx="1" transform="rotate(${a} 14 14)"/>`).join("")}</g>`
          : // lantern
            `<g fill="%23000"><rect x="9" y="8" width="10" height="12" rx="5"/><rect x="11" y="5" width="6" height="2" rx="1"/><rect x="11" y="21" width="6" height="2" rx="1"/></g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${shape}</svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.13]"
      style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`, backgroundSize: "28px 28px" }}
    />
  );
}
