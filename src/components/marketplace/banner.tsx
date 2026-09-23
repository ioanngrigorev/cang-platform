"use client";

import * as React from "react";
import { isPlaceholderSrc, placeholderArt } from "@/lib/placeholder-art";
import { cn } from "@/lib/utils";

/** Decorative banner image; a missing asset becomes generated artwork instead of an empty band. */
export function BannerImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = React.useState(isPlaceholderSrc(src));
  if (failed || typeof src !== "string") {
    return <div role="img" aria-label={alt} className={cn("h-full w-full overflow-hidden", className)} dangerouslySetInnerHTML={{ __html: placeholderArt(alt, true) }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />;
}
