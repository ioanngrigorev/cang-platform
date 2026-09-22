"use client";

import { ImageOff } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plain <img> with graceful fallback (external seed images may be unavailable offline; uploads are served locally).
 * Use `fill` for aspect-ratio boxes (parent must be relative).
 */
export function SmartImage({
  src,
  alt,
  className,
  fallbackLabel,
  fill,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string; fill?: boolean }) {
  const [failed, setFailed] = React.useState(!src);
  React.useEffect(() => setFailed(!src), [src]);
  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-ink-50 to-steel-100 text-steel-400", fill && "absolute inset-0", className)} aria-label={alt}>
        <div className="flex flex-col items-center gap-1 p-2 text-center">
          <ImageOff className="size-6" />
          {fallbackLabel ? <span className="line-clamp-2 text-[11px] font-medium text-steel-500">{fallbackLabel}</span> : null}
        </div>
      </div>
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
