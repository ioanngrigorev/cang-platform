"use client";

import { Star } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Accessible 1–5 star radio group; submits `name` as a number. */
export function StarInput({ name, label, hint, defaultValue = 0, error }: { name: string; label: string; hint?: string; defaultValue?: number; error?: string }) {
  const [value, setValue] = React.useState(defaultValue);
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium text-ink-900">{label}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => setValue(n)} className="sr-only" aria-label={`${n} / 5`} />
            <Star className={cn("size-6 transition-colors", n <= shown ? "fill-brass-400 text-brass-400" : "fill-steel-100 text-steel-300")} />
          </label>
        ))}
        <span className="ml-2 text-sm tabular-nums text-steel-600">{value ? `${value}/5` : "—"}</span>
      </div>
      {error ? (
        <p className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-steel-500">{hint}</p>
      ) : null}
    </fieldset>
  );
}
