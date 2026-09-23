"use client";

import * as React from "react";
import { isPlaceholderSrc, placeholderArt } from "@/lib/placeholder-art";
import { cn } from "@/lib/utils";

/** Decorative banner image; a missing asset becomes generated artwork instead of an empty band. */
export function BannerImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const art = React.useMemo(() => placeholderArt(alt, 1600, 600), [alt]);
  const [failed, setFailed] = React.useState(isPlaceholderSrc(src));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={failed ? art : (src as string)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />;
}
