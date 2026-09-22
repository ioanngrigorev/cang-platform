import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/routing";

const SITE = "CANG";
const SUFFIX = " | CANG – Vietnam B2B Marketplace";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Build page metadata with canonical + hreflang alternates for every locale. */
export function buildMetadata(opts: {
  locale: Locale | string;
  path: string; // path without locale prefix, e.g. "/products/backpacks"
  title: string;
  description?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article" | "product";
  suffix?: boolean;
}): Metadata {
  const base = siteUrl();
  const title = opts.suffix === false ? opts.title : `${opts.title}${SUFFIX}`;
  const canonical = `${base}/${opts.locale}${opts.path === "/" ? "" : opts.path}`;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${base}/${l}${opts.path === "/" ? "" : opts.path}`;
  languages["x-default"] = `${base}/en${opts.path === "/" ? "" : opts.path}`;
  return {
    title: { absolute: title },
    description: opts.description,
    alternates: { canonical, languages },
    robots: opts.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description: opts.description,
      url: canonical,
      siteName: SITE,
      locale: opts.locale === "vi" ? "vi_VN" : "en_US",
      type: opts.type === "product" ? "website" : (opts.type ?? "website"),
      images: opts.image ? [{ url: opts.image.startsWith("http") ? opts.image : `${base}${opts.image}` }] : undefined,
    },
    twitter: { card: opts.image ? "summary_large_image" : "summary", title, description: opts.description },
  };
}

// ---------- JSON-LD helpers ----------

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CANG",
    url: siteUrl(),
    logo: `${siteUrl()}/logo.svg`,
    sameAs: [],
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "support@cang.vn" }],
  };
}

export function websiteJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CANG",
    url: `${siteUrl()}/${locale}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl()}/${locale}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${siteUrl()}/${locale}${it.path}`,
    })),
  };
}

export function productJsonLd(p: {
  name: string;
  description?: string | null;
  image?: string | null;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  currency: string;
  lowPrice?: number | null;
  highPrice?: number | null;
  supplierName: string;
  supplierSlug: string;
  locale: string;
}) {
  const url = `${siteUrl()}/${p.locale}/product/${p.slug}`;
  const offers =
    p.lowPrice != null
      ? {
          "@type": "AggregateOffer",
          priceCurrency: p.currency,
          lowPrice: p.lowPrice,
          highPrice: p.highPrice ?? p.lowPrice,
          offerCount: 1,
          availability: "https://schema.org/InStock",
          url,
          seller: { "@type": "Organization", name: p.supplierName, url: `${siteUrl()}/${p.locale}/supplier/${p.supplierSlug}` },
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? undefined,
    image: p.image ? (p.image.startsWith("http") ? p.image : `${siteUrl()}${p.image}`) : undefined,
    sku: p.sku ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    url,
    offers,
  };
}

export function supplierJsonLd(c: {
  name: string;
  description?: string | null;
  logo?: string | null;
  slug: string;
  city?: string | null;
  province?: string | null;
  countryCode: string;
  yearEstablished?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    description: c.description ?? undefined,
    logo: c.logo ? (c.logo.startsWith("http") ? c.logo : `${siteUrl()}${c.logo}`) : undefined,
    url: `${siteUrl()}/${c.locale}/supplier/${c.slug}`,
    foundingDate: c.yearEstablished ? String(c.yearEstablished) : undefined,
    address: { "@type": "PostalAddress", addressLocality: c.city ?? undefined, addressRegion: c.province ?? undefined, addressCountry: c.countryCode },
    aggregateRating:
      c.ratingCount && c.ratingCount > 0
        ? { "@type": "AggregateRating", ratingValue: c.ratingAvg, reviewCount: c.ratingCount, bestRating: 5 }
        : undefined,
  };
}

export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}
