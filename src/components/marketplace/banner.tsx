"use client";

import * as React from "react";
import { isPlaceholderSrc, placeholderArt } from "@/lib/placeholder-art";
import { productPhoto } from "@/lib/product-photos";
import { cn } from "@/lib/utils";

/**
 * Decorative banner image. A missing asset becomes a stock photograph of the subject's product type
 * when `photo` names one (a supplier's tagline, a cluster's main industry), else generated artwork,
 * so the band is never empty.
 */
export function BannerImage({ src, alt, className, photo }: { src: string | null | undefined; alt: string; className?: string; photo?: string | null }) {
  const [failed, setFailed] = React.useState(isPlaceholderSrc(src));
  const [stockFailed, setStockFailed] = React.useState(false);
  const stock = photo ? productPhoto(photo, "banner") : null;
  if (failed || typeof src !== "string") {
    if (stock && !stockFailed) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={stock} alt={alt} decoding="async" onError={() => setStockFailed(true)} className={cn("h-full w-full object-cover", className)} />;
    }
    return <div role="img" aria-label={alt} className={cn("h-full w-full overflow-hidden", className)} dangerouslySetInnerHTML={{ __html: placeholderArt(alt, true) }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />;
}
