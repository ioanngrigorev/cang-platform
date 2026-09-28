/**
 * Downscaled copies of the stock product photos for responsive `srcset`:
 *   public/img/products/<id>.webp        960 px (original)
 *   public/img/products/w640/<id>.webp   640 px
 *   public/img/products/w320/<id>.webp   320 px
 *   public/img/products/w160/<id>.webp   160 px
 * A 64 px category tile or a 300 px product card then downloads a file of its own size instead of
 * the 960 px original. The copies are committed, so production needs no image processing.
 *
 * Run after adding photos: `node scripts/make-photo-thumbnails.mjs`. It uses the sharp that Next.js
 * installs for its image optimiser (not a direct dependency, hence the lookup through next).
 * Existing copies are kept unless the original is newer.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

export const THUMB_WIDTHS = [160, 320, 640];
const DIR = path.resolve(process.cwd(), "public/img/products");

const originals = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp"));
let made = 0;
for (const w of THUMB_WIDTHS) fs.mkdirSync(path.join(DIR, `w${w}`), { recursive: true });
for (const file of originals) {
  const src = path.join(DIR, file);
  const srcTime = fs.statSync(src).mtimeMs;
  for (const w of THUMB_WIDTHS) {
    const out = path.join(DIR, `w${w}`, file);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcTime) continue;
    await sharp(src)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w <= 160 ? 70 : 72, effort: 6 })
      .toFile(out);
    made++;
  }
}
console.log(`${originals.length} photos, ${made} thumbnails written`);
