/**
 * Deterministic placeholder artwork for catalogue images.
 *
 * The seed catalogue was authored against loremflickr.com, which is gone. Rather than swap one
 * hotlinked stock service for another that will also die, a missing image is drawn here: a tinted
 * panel and one soft wash, with a pictogram layered over it by SmartImage. The markup is inlined rather than encoded
 * as a data URI so it inherits the theme's CSS custom properties and follows Jade and Lime
 * automatically. The same subject always yields the same picture, on the server and in the
 * browser alike, so nothing shifts between render and hydration.
 *
 * Kept deliberately quiet: a flat tint and one soft wash. Anything more patterned turns a page
 * of twenty-four cards into a wall of geometry.
 */

/** Image services the seed data points at that no longer serve anything. */
const DEAD_HOSTS = /^https?:\/\/(?:www\.)?(?:loremflickr\.com|source\.unsplash\.com|placeimg\.com|lorempixel\.com)\//i;

export function isPlaceholderSrc(src: string | null | undefined): boolean {
  return !src || DEAD_HOSTS.test(src);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** xorshift32: a repeatable sequence, so the artwork never changes between renders. */
function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}


const W = 640;
const H = 480;
const brand = (a: number) => `rgb(var(--brand-500) / ${a})`;

/** Inline SVG wash for `subject`; the pictogram is layered over it by SmartImage. */
export function placeholderArt(subject: string | null | undefined, wide = false): string {
  const subj = (subject ?? "").trim();
  const seed = hash(subj || "cang");
  const r = rng(seed);
  // The wash leans from one of four corners, which is all the variety these panels need.
  const corner = Math.floor(r() * 4);
  const x1 = corner === 0 || corner === 3 ? 0 : 1;
  const y1 = corner < 2 ? 0 : 1;
  const id = `w${seed.toString(36)}`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">`
    + `<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${1 - x1}" y2="${1 - y1}">`
    + `<stop offset="0" stop-color="${brand(0.14)}"/><stop offset="1" stop-color="${brand(0.03)}"/></linearGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  return svg + "</svg>";
}
