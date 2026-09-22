"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Decorative banner image that simply disappears when the asset cannot be loaded (no placeholder icon). */
export function BannerImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = React.useState(!src);
  if (failed || !src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />;
}
