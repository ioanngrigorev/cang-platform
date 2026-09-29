import { NextResponse } from "next/server";
import { renderOgCard, ogPhoto, type OgCard } from "@/lib/og";
import { isPlaceholderSrc } from "@/lib/placeholder-art";
import { productPhoto, productPhotoFor } from "@/lib/product-photos";
import { formatMoney, formatNumber, localized } from "@/lib/utils";
import { getProductBySlug, getSupplierBySlug } from "@/modules/catalog/queries";

/**
 * Social preview images (1200×630 PNG):
 *   /og/default.<locale>.png
 *   /og/product/<slug>.<locale>.png
 *   /og/supplier/<slug>.<locale>.png
 * Referenced from page metadata (src/lib/seo.ts). Unknown slugs fall back to the default card.
 */
export const runtime = "nodejs";

type Locale = "en" | "vi";
const L = {
  en: {
    title: "Source from verified Vietnamese manufacturers",
    subtitle: "RFQs, trade assurance, logistics and financing for global buyers",
    facts: ["Verified factories", "Escrow-backed payments", "Freight & inspection"],
    footer: "cang.vn · Vietnam B2B marketplace",
    verified: "Verified manufacturer",
    moq: (n: string, unit: string) => `MOQ ${n} ${unit}`,
    from: (p: string) => `From ${p}`,
    lead: (d: number) => `Lead time ${d} days`,
    est: (y: number) => `Est. ${y}`,
    products: (n: string) => `${n} products`,
    rating: (r: string, n: number) => `Rated ${r} / 5 · ${n} ${n === 1 ? "review" : "reviews"}`,
  },
  vi: {
    title: "Tìm nguồn hàng từ các nhà sản xuất Việt Nam đã xác minh",
    subtitle: "RFQ, đảm bảo giao dịch, logistics và tài chính cho người mua toàn cầu",
    facts: ["Nhà máy đã xác minh", "Thanh toán ký quỹ", "Vận chuyển & kiểm định"],
    footer: "cang.vn · Sàn B2B Việt Nam",
    verified: "Nhà sản xuất đã xác minh",
    moq: (n: string, unit: string) => `MOQ ${n} ${unit}`,
    from: (p: string) => `Từ ${p}`,
    lead: (d: number) => `Sản xuất ${d} ngày`,
    est: (y: number) => `Thành lập ${y}`,
    products: (n: string) => `${n} sản phẩm`,
    rating: (r: string, n: number) => `Đánh giá ${r} / 5 · ${n} lượt`,
  },
} as const;

const PHOTO = { width: 470, height: 630 };

function defaultCard(locale: Locale): OgCard {
  const t = L[locale];
  return { title: t.title, subtitle: t.subtitle, facts: [...t.facts], footer: t.footer };
}

async function productCard(slug: string, locale: Locale): Promise<OgCard | null> {
  const p = await getProductBySlug(slug);
  if (!p) return null;
  const t = L[locale];
  const rec = p as unknown as Record<string, unknown>;
  const prices = [...p.priceTiers.map((x) => Number(x.price)), ...(p.basePrice != null ? [Number(p.basePrice)] : [])].filter((n) => Number.isFinite(n) && n > 0);
  const img = p.images[0]?.url;
  const src = img && !isPlaceholderSrc(img) ? img : productPhotoFor(p.title, p.slug, 0);
  return {
    badge: p.company.verificationStatus === "VERIFIED" ? t.verified : null,
    eyebrow: localized(p.company as unknown as Record<string, unknown>, "name", locale),
    title: localized(rec, "title", locale),
    facts: [
      t.moq(formatNumber(p.moq, locale), p.unit),
      ...(prices.length ? [t.from(formatMoney(Math.min(...prices), p.currency, locale))] : []),
      ...(p.leadTimeDays ? [t.lead(p.leadTimeDays)] : []),
    ],
    photo: await ogPhoto(src, PHOTO.width, PHOTO.height),
    footer: "cang.vn",
  };
}

async function supplierCard(slug: string, locale: Locale): Promise<OgCard | null> {
  const s = await getSupplierBySlug(slug);
  if (!s) return null;
  const t = L[locale];
  const rec = s as unknown as Record<string, unknown>;
  const province = s.province ? localized(s.province as unknown as Record<string, unknown>, "name", locale) : null;
  // "Can Tho" and "Cần Thơ" are the same place: show the city only when it differs from the province.
  const plain = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
  const cityDiffers = s.city && (!province || plain(s.city) !== plain(province));
  const place = [cityDiffers ? s.city : null, province, locale === "vi" ? "Việt Nam" : "Vietnam"].filter(Boolean).join(", ");
  const src = s.coverUrl && !isPlaceholderSrc(s.coverUrl) ? s.coverUrl : productPhoto(s.tagline ?? s.name, s.coverUrl ?? "");
  const rating = Number(s.ratingAvg);
  return {
    badge: s.verificationStatus === "VERIFIED" ? t.verified : null,
    eyebrow: place,
    title: localized(rec, "name", locale),
    subtitle: localized(rec, "tagline", locale) || null,
    facts: [
      ...(s.yearEstablished ? [t.est(s.yearEstablished)] : []),
      ...(s.productCount ? [t.products(formatNumber(s.productCount, locale))] : []),
      ...(s.ratingCount > 0 ? [t.rating(rating.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 }), s.ratingCount)] : []),
    ],
    photo: await ogPhoto(src, PHOTO.width, PHOTO.height),
    footer: "cang.vn",
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ parts: string[] }> }) {
  const { parts } = await ctx.params;
  const file = parts.at(-1) ?? "";
  const m = /^(.+)\.(en|vi)\.png$/.exec(file);
  if (!m || parts.length > 2) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [, name, locale] = m as unknown as [string, string, Locale];
  const kind = parts.length === 2 ? parts[0] : name;

  let card: OgCard | null = null;
  if (kind === "product" && parts.length === 2) card = await productCard(name, locale);
  else if (kind === "supplier" && parts.length === 2) card = await supplierCard(name, locale);
  else if (kind !== "default" || parts.length !== 1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unknown or unpublished slugs still get a valid (short-cached) image rather than a broken preview.
  return card ? renderOgCard(card) : renderOgCard(defaultCard(locale), kind === "default" ? 86_400 : 600);
}
