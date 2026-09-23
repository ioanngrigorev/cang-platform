"use client";

import * as React from "react";
import { isPlaceholderSrc, placeholderArt } from "@/lib/placeholder-art";
import { cn } from "@/lib/utils";

/**
 * Plain <img> that falls back to generated artwork rather than a broken-image icon, so a missing
 * or dead image URL still renders something deliberate. Use `fill` for aspect-ratio boxes (parent
 * must be relative).
 */
export function SmartImage({
  src,
  alt,
  className,
  fallbackLabel,
  fill,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string; fill?: boolean }) {
  const subject = fallbackLabel ?? (typeof alt === "string" ? alt : "");
  const unusable = typeof src !== "string" || isPlaceholderSrc(src);
  const [failed, setFailed] = React.useState(unusable);
  React.useEffect(() => setFailed(unusable), [unusable, src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt ?? undefined}
        className={cn("overflow-hidden bg-surface", fill && "absolute inset-0 h-full w-full", className)}
        dangerouslySetInnerHTML={{ __html: placeholderArt(subject) }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(fill && "absolute inset-0 h-full w-full object-cover", className)}
      {...props}
    />
  );
}
