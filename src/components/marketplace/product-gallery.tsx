"use client";

import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import * as React from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { isPlaceholderSrc } from "@/lib/placeholder-art";
import { cn } from "@/lib/utils";

export type GalleryImage = { url: string; alt?: string | null };

/** Product image gallery: main image + thumbnail strip, keyboard navigable. */
/** `imageOfLabel` is a template such as "Image {index} of {total}" — a plain string, so it crosses the server/client boundary. */
export function ProductGallery({ images, title, photoSubject, videoUrl, imageOfLabel }: { images: GalleryImage[]; title: string; photoSubject?: string; videoUrl?: string | null; imageOfLabel: string }) {
  const label = (index: number, total: number) => imageOfLabel.replace("{index}", String(index)).replace("{total}", String(total));
  const [index, setIndex] = React.useState(0);
  const total = images.length;
  const current = images[index];
  const go = (delta: number) => setIndex((i) => (total ? (i + delta + total) % total : 0));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  };
  return (
    <div className="space-y-3" onKeyDown={onKey}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-steel-200 bg-steel-50" tabIndex={0} aria-label={total ? label(index + 1, total) : title}>
        <SmartImage key={current?.url ?? "none"} src={current?.url} alt={current?.alt ?? title} fill photo={photoSubject ?? true} fallbackLabel={title} className={isPlaceholderSrc(current?.url) ? "object-cover" : "object-contain"} />
        {total > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-steel-200 bg-white/90 p-2 text-ink-900 shadow-card hover:bg-white">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-steel-200 bg-white/90 p-2 text-ink-900 shadow-card hover:bg-white">
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-ink-950/70 px-2 py-0.5 text-[11px] font-medium text-white">{label(index + 1, total)}</span>
          </>
        ) : null}
      </div>
      {total > 1 || videoUrl ? (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={label(i + 1, total)}
              aria-current={i === index}
              className={cn("relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-steel-50", i === index ? "border-ink-900" : "border-steel-200 hover:border-steel-400")}
            >
              <SmartImage src={img.url} alt={img.alt ?? ""} fill photo={photoSubject ?? true} fallbackLabel={title} />
            </button>
          ))}
          {videoUrl ? (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex size-16 shrink-0 items-center justify-center rounded-md border-2 border-steel-200 bg-ink-900 text-white hover:border-steel-400" aria-label="Video">
              <PlayCircle className="size-6" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
