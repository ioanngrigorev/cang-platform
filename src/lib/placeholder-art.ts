/**
 * Deterministic placeholder artwork for catalogue images.
 *
 * The seed catalogue was authored against loremflickr.com, which is gone. Rather than swap one
 * hotlinked stock service for another that will also die, a missing image is drawn here: a tinted
 * panel, one quiet texture and the subject's monogram. The markup is inlined rather than encoded
 * as a data URI so it inherits the theme's CSS custom properties and follows Jade and Lime
 * automatically. The same subject always yields the same picture, on the server and in the
 * browser alike, so nothing shifts between render and hydration.
 *
 * Kept deliberately quiet: a flat tint, one soft wash and a small monogram. Anything more
 * patterned turns a page of twenty-four cards into a wall of geometry.
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

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function monogram(subject: string): string {
  const all = subject.replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(Boolean);
  // Product titles often open with a measurement ("65L Trekking Backpack"); letters read better.
  const lettered = all.filter((word) => /^\p{L}/u.test(word));
  const words = lettered.length ? lettered : all;
  if (!words.length) return "CA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const W = 640;
const H = 480;
const brand = (a: number) => `rgb(var(--brand-500) / ${a})`;

/**
 * Inline SVG markup for `subject`. `wide` drops the monogram: blown across a hero strip it
 * reads as a mistake rather than as a mark.
 */
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
  if (!wide && subj) {
    const fs = Math.round(H * 0.13);
    svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" dominant-baseline="central" font-family="inherit" font-size="${fs}" font-weight="600" letter-spacing="${Math.round(fs * 0.12)}" fill="${brand(0.5)}">${esc(monogram(subj))}</text>`;
  }
  return svg + "</svg>";
}
