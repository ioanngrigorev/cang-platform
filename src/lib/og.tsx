import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { storage } from "@/modules/storage";

/**
 * Social preview cards (Open Graph / Twitter, 1200×630 PNG) rendered with next/og.
 * Served from /og/… (see src/app/og/[...parts]/route.tsx) — outside /api so crawlers that honour
 * robots.txt (Twitterbot, LinkedIn) can fetch them. Font: Be Vietnam Pro (OFL, public/fonts/og), so
 * Vietnamese titles keep their diacritics.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const C = { bg: "#0c1512", panel: "#13201c", text: "#ffffff", muted: "#a3b4ad", brand: "#00a181", lime: "#c6f24e", hairline: "#23332e" };

// Be Vietnam Pro 500/700: the fontsource latin, latin-ext and vietnamese subsets merged into one TTF per
// weight (satori needs every glyph in a single font and cannot read woff2).
let fontsPromise: Promise<Array<{ name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" }>> | null = null;
function fonts() {
  fontsPromise ??= Promise.all(
    ([500, 700] as const).map(async (weight) => {
      const buf = await readFile(path.join(process.cwd(), "public", "fonts", "og", `be-vietnam-pro-${weight}.ttf`));
      return { name: "Be Vietnam Pro", data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight, style: "normal" as const };
    }),
  );
  return fontsPromise;
}

/**
 * A site image as a JPEG data URL, cropped to the photo panel. Only local sources: stock photos under
 * /img and uploads under /api/files (never arbitrary URLs). Null when unavailable.
 */
export async function ogPhoto(src: string | null | undefined, width: number, height: number): Promise<string | null> {
  if (!src) return null;
  try {
    let data: Buffer | null = null;
    if (/^\/img\/[\w\-/]+\.(webp|jpe?g|png)$/.test(src)) data = await readFile(path.join(process.cwd(), "public", src));
    else if (src.startsWith("/api/files/")) data = (await storage().get(decodeURIComponent(src.slice("/api/files/".length))))?.data ?? null;
    if (!data) return null;
    const sharp = loadSharp();
    if (!sharp) return null;
    const jpeg = await sharp(data).resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null; // the card still renders, just without the photo
  }
}

/** sharp ships with Next.js (its image optimiser) rather than as our own dependency: resolve it from there. */
type Sharp = (input: Buffer) => {
  resize(width: number, height: number, opts: { fit: "cover"; position: string }): { jpeg(opts: { quality: number }): { toBuffer(): Promise<Buffer> } };
};
let sharpModule: Sharp | null | undefined;
function loadSharp() {
  if (sharpModule !== undefined) return sharpModule;
  // process.getBuiltinModule keeps webpack from trying (and failing) to resolve this at build time.
  const nodeModule = process.getBuiltinModule?.("node:module") as typeof import("node:module") | undefined;
  for (const base of ["node_modules/next/package.json", "package.json"]) {
    try {
      if (!nodeModule) break;
      sharpModule = nodeModule.createRequire(path.join(process.cwd(), base))("sharp") as Sharp;
      return sharpModule;
    } catch {
      // try the next location
    }
  }
  sharpModule = null;
  return sharpModule;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M35.49 14.36 A15 15 0 1 0 35.49 33.64" fill="none" stroke={C.brand} strokeWidth="8" strokeLinecap="round" />
      <rect x="30" y="20.5" width="15" height="7" rx="3.5" fill={C.brand} opacity="0.5" />
    </svg>
  );
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export type OgCard = {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  facts?: string[];
  badge?: string | null;
  photo?: string | null;
  footer: string;
};

/** Render a card: text on the left, optional photo panel on the right, CANG mark and domain at the bottom. */
export async function renderOgCard(card: OgCard, cacheSeconds = 86_400) {
  const photoW = 470;
  const textW = card.photo ? OG_SIZE.width - photoW - 64 - 56 : OG_SIZE.width - 128;
  // The text column is ~610 px next to a photo, ~1070 px without: size the title so it fits in 3 lines.
  const perLine = card.photo ? 1 : 1.75;
  const len = card.title.length / perLine;
  const titleSize = len > 60 ? 42 : len > 42 ? 48 : len > 26 ? 56 : 64;
  const facts = (card.facts ?? []).slice(0, card.photo ? 3 : 4);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: C.bg, color: C.text, fontFamily: "Be Vietnam Pro" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: textW + 64 + 56, padding: "56px 56px 48px 64px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {card.badge ? (
              <div style={{ display: "flex", alignSelf: "flex-start", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: "rgba(0,161,129,0.16)", color: C.lime, fontSize: 22, fontWeight: 700, marginBottom: 26 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: C.lime }} />
                {card.badge}
              </div>
            ) : null}
            {card.eyebrow ? <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: C.brand, marginBottom: 14 }}>{clip(card.eyebrow, 60)}</div> : null}
            <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.14, letterSpacing: "-0.02em" }}>{clip(card.title, card.photo ? 80 : 110)}</div>
            {card.subtitle ? <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: C.muted, marginTop: 16, lineHeight: 1.3 }}>{clip(card.subtitle, card.photo ? 64 : 110)}</div> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {facts.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {facts.map((f) => (
                  <div key={f} style={{ display: "flex", padding: "8px 16px", borderRadius: 12, border: `2px solid ${C.hairline}`, background: C.panel, fontSize: 22, fontWeight: 500, color: "#dfe8e4" }}>
                    {clip(f, 40)}
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Mark size={44} />
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>CANG</div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: C.muted, marginLeft: 12 }}>{card.footer}</div>
            </div>
          </div>
        </div>
        {!card.photo ? (
          <div style={{ display: "flex", position: "absolute", right: -60, bottom: -80, opacity: 0.12 }}>
            <Mark size={460} />
          </div>
        ) : null}
        {card.photo ? (
          <div style={{ display: "flex", width: photoW, height: "100%", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={card.photo} width={photoW} height={OG_SIZE.height} style={{ objectFit: "cover" }} />
            <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 6, height: "100%", background: C.brand }} />
          </div>
        ) : null}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: await fonts(),
      headers: { "Cache-Control": `public, max-age=${cacheSeconds}, stale-while-revalidate=604800` },
    },
  );
}
