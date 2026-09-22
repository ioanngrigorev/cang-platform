import { Clock } from "lucide-react";
import * as React from "react";
import { Breadcrumbs } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/modules/content/markdown";

/**
 * Article layout for CMS-rendered markdown (guides, legal, help, about…).
 * Sanitised HTML comes from `modules/content/markdown.ts`; the only place `dangerouslySetInnerHTML` is used for content.
 */
export function ContentArticle({
  eyebrow,
  title,
  excerpt,
  html,
  toc,
  tocTitle,
  readingLabel,
  breadcrumbs,
  aside,
  before,
  after,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  excerpt?: string | null;
  html: string;
  toc?: TocItem[];
  tocTitle?: string;
  readingLabel?: string;
  breadcrumbs?: Array<{ label: React.ReactNode; href?: string }>;
  aside?: React.ReactNode;
  before?: React.ReactNode;
  after?: React.ReactNode;
  className?: string;
}) {
  const showToc = toc && toc.length >= 3;
  return (
    <div className={cn("container py-8 sm:py-10", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-4" /> : null}
      <header className="max-w-3xl">
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brass-600">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {excerpt ? <p className="mt-3 text-base text-steel-600 sm:text-lg">{excerpt}</p> : null}
        {readingLabel ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-steel-500">
            <Clock className="size-3.5" /> {readingLabel}
          </p>
        ) : null}
      </header>
      {before}
      <div className={cn("mt-8 grid gap-10", showToc || aside ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "")}>
        <article className="prose-cang max-w-3xl [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_img]:rounded-lg" dangerouslySetInnerHTML={{ __html: html }} />
        {showToc || aside ? (
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {showToc ? (
              <nav aria-label={tocTitle} className="rounded-lg border border-steel-200 bg-white p-4 shadow-card">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel-500">{tocTitle}</p>
                <ol className="space-y-1 text-sm">
                  {toc.map((item) => (
                    <li key={item.id} className={cn(item.level === 3 && "pl-3")}>
                      <a href={`#${item.id}`} className="block py-0.5 text-steel-600 hover:text-ink-900">
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            {aside}
          </aside>
        ) : null}
      </div>
      {after}
    </div>
  );
}
