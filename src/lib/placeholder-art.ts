/**
 * Deterministic placeholder artwork, generated in-process as an inline SVG data URI.
 *
 * The seed catalogue was authored against loremflickr.com, which is gone; rather than swap one
 * hotlinked stock service for another that will also die, every missing image is drawn here from
 * the "chợ & lụa" palette: a tinted ground, one quiet texture, and the subject's monogram. The
 * same subject always yields the same picture, on the server and in the browser alike, so nothing
 * shifts between render and hydration.
 */

const PAPER = "#FFFBF5";
const INK = "#241C18";
const GOLD = "#FFCD00";
/** Jade and brass appear twice so the grid does not read as uniformly pink. */
const ACCENTS = ["#DA251D", "#0F9D6B", "#C49200", "#D94A70", "#8A2C4D", "#0F9D6B", "#C49200"];

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

const chan = (x: string): number[] => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
const toHex = (a: number[]): string => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number): string => { const A = chan(a), B = chan(b); return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t)); };
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function monogram(subject: string): string {
  const words = subject.replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "CA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Warp and weft — silk seen close up. */
function cloth(r: () => number, w: number, h: number, line: string): string {
  let o = "";
  const sy = h / 11;
  for (let y = 0; y < h; y += sy) o += `<rect x="0" y="${(y + sy * 0.3).toFixed(1)}" width="${w}" height="${(sy * 0.34).toFixed(1)}" fill="${line}"/>`;
  const sx = w / 15;
  for (let x = 0; x < w; x += sx) o += `<rect x="${(x + sx * 0.28).toFixed(1)}" y="0" width="${(sx * 0.3).toFixed(1)}" height="${h}" fill="${line}"/>`;
  return o;
}

/** Concentric arcs from a corner — a fan, a ripple, a radar sweep. */
function fan(r: () => number, w: number, h: number, line: string): string {
  const cx = r() < 0.5 ? 0 : w, cy = h, max = Math.hypot(w, h), rings = 6;
  let o = "";
  for (let i = rings; i >= 1; i--) o += `<circle cx="${cx}" cy="${cy}" r="${((max / rings) * i).toFixed(1)}" fill="none" stroke="${line}" stroke-width="${((max / rings) * 0.34).toFixed(1)}"/>`;
  return o;
}

/** A low skyline of sheds and stacks — the yard at a distance. */
function skyline(r: () => number, w: number, h: number, line: string): string {
  const base = h * 0.9, n = 9, bw = w / n;
  let o = "";
  for (let i = 0; i < n; i++) { const hh = h * (0.05 + r() * 0.17); o += `<rect x="${(i * bw).toFixed(1)}" y="${(base - hh).toFixed(1)}" width="${(bw * 0.9).toFixed(1)}" height="${hh.toFixed(1)}" fill="${line}"/>`; }
  return o + `<rect x="0" y="${base.toFixed(1)}" width="${w}" height="${(h - base).toFixed(1)}" fill="${line}"/>`;
}

/** Diagonal hatch — the plainest of the four. */
function hatch(r: () => number, w: number, h: number, line: string): string {
  let o = "", x = -h;
  const step = h / 8;
  while (x < w + h) { o += `<rect x="${x.toFixed(1)}" y="${(-h).toFixed(1)}" width="${(step * 0.42).toFixed(1)}" height="${(h * 3).toFixed(1)}" transform="rotate(-24 ${x.toFixed(1)} 0)" fill="${line}"/>`; x += step; }
  return o;
}

const MOTIFS = [cloth, fan, skyline, hatch];

/** An inline `data:` SVG for `subject`, sized `w`×`h`. Wide strips get the texture without a monogram. */
export function placeholderArt(subject: string | null | undefined, w = 640, h = 480): string {
  const subj = (subject ?? "").trim();
  const seed = hash(subj || "cang");
  const r = rng(seed);
  const wide = w / h >= 2.2;
  // Hero strips always sit on lacquer black: they carry white type, and a pale band reads as empty.
  const dark = wide || ((seed >>> 5) & 3) === 0;
  const accent = ACCENTS[seed % ACCENTS.length];
  const ground = dark ? mix(INK, accent, 0.24) : mix(PAPER, accent, 0.2);
  const line = dark ? mix(ground, "#ffffff", wide ? 0.13 : 0.08) : mix(ground, accent, 0.16);
  const motif = MOTIFS[((seed >>> 11) ^ (seed >>> 3)) % MOTIFS.length];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid slice"><rect width="${w}" height="${h}" fill="${ground}"/>${motif(r, w, h, line)}`;
  if (wide) {
    svg += `<rect x="0" y="${(h * 0.82).toFixed(1)}" width="${w}" height="${Math.max(2, h * 0.008).toFixed(1)}" fill="${GOLD}" opacity="0.8"/>`;
  } else if (subj) {
    const fs = h * 0.3, cy = h * 0.5, type = dark ? PAPER : mix(accent, INK, 0.25);
    svg += `<text x="${(w / 2).toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="ui-sans-serif,system-ui,'Helvetica Neue',Arial,sans-serif" font-size="${fs.toFixed(1)}" font-weight="700" letter-spacing="${(fs * 0.04).toFixed(1)}" fill="${type}">${esc(monogram(subj))}</text>`;
    svg += `<rect x="${(w / 2 - fs * 0.42).toFixed(1)}" y="${(cy + fs * 0.62).toFixed(1)}" width="${(fs * 0.84).toFixed(1)}" height="${Math.max(2, h * 0.012).toFixed(1)}" fill="${GOLD}"/>`;
  }
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg + "</svg>");
}
