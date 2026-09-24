"use client";

import * as React from "react";
import { isPlaceholderSrc, placeholderArt } from "@/lib/placeholder-art";
import { placeholderIcon } from "@/lib/placeholder-icon";
import { productPhoto } from "@/lib/product-photos";
import { cn } from "@/lib/utils";

/**
 * Plain <img> that never shows a broken-image icon. A missing or dead URL falls back, in order,
 * to a stock photograph of the same kind of product (when `photo` is set and the subject is
 * recognised), then to a tinted wash with a pictogram chosen from the subject's own words.
 * Use `fill` for aspect-ratio boxes (parent must be relative).
 */
export function SmartImage({
  src,
  alt,
  className,
  fallbackLabel,
  fill,
  photo,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackLabel?: string;
  fill?: boolean;
  /** true: match a stock photo on the label; a string: match on this text instead (use the English title on localised pages). */
  photo?: boolean | string;
}) {
  const subject = fallbackLabel ?? (typeof alt === "string" ? alt : "");
  const unusable = typeof src !== "string" || isPlaceholderSrc(src);
  const photoSubject = typeof photo === "string" ? photo : photo ? subject : null;
  const stock = photoSubject ? productPhoto(photoSubject, typeof src === "string" ? src : "") : null;
  const [failed, setFailed] = React.useState(unusable);
  const [stockFailed, setStockFailed] = React.useState(false);
  React.useEffect(() => setFailed(unusable), [unusable, src]);

  if (failed && stock && !stockFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={stock}
        alt={alt ?? ""}
        loading="lazy"
        decoding="async"
        onError={() => setStockFailed(true)}
        className={cn(fill && "absolute inset-0 h-full w-full object-cover", className)}
        {...props}
      />
    );
  }

  if (failed) {
    const Icon = placeholderIcon(subject);
    return (
      <div
        role="img"
        aria-label={alt ?? undefined}
        className={cn("relative overflow-hidden bg-surface", fill && "absolute inset-0 h-full w-full", className)}
      >
        <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: placeholderArt(subject) }} />
        <Icon className="absolute left-1/2 top-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 text-brand-500/55" strokeWidth={1.25} />
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
