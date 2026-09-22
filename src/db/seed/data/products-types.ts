/** Shared shape of the demo product catalogue (see products-a/b/c.ts). */

export type ProductSeed = {
  /** company slug (supplier, or the Vietnamese buyer/seller distributor) */
  supplier: string;
  slug: string;
  title: string;
  titleVi: string;
  /** leaf category slug from data/reference.ts */
  category: string;
  /** product-specific paragraph (2–3 sentences); the rest of the description is composed from structured data */
  blurb: string;
  blurbVi: string;
  priceType?: "FIXED" | "TIERED" | "NEGOTIABLE" | "CONTACT";
  currency?: "USD" | "VND";
  /** price at MOQ (first tier) */
  price: number;
  moq: number;
  unit: string;
  lead: number;
  /** false = no samples; undefined = default sample policy */
  sample?: { price: number; days: number } | false;
  hs: string;
  brand?: string;
  keywords: string[];
  /** loremflickr keywords, e.g. "hiking,backpack" */
  img: string;
  specs: Array<[name: string, value: string, unit?: string]>;
  /** attribute → options; each option becomes a variant (max 5 variants per product) */
  variants?: Record<string, string[]>;
  certs?: string[];
  featured?: boolean;
  status?: "DRAFT" | "PENDING_REVIEW";
  pack?: string;
  packVi?: string;
  customizable?: boolean;
};
