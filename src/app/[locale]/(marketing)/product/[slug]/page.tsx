import { BadgeCheck, Clock, Eye, Factory, FileText, MapPin, MessageSquare, Package, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProductGrid } from "@/components/marketplace/grids";
import { ProductGallery } from "@/components/marketplace/product-gallery";
import { SaveControl } from "@/components/marketplace/save-control";
import { ShareButton } from "@/components/marketplace/share-button";
import { Badge, TrustBadges, VerifiedMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, DataList } from "@/components/ui/card";
import { Avatar, Breadcrumbs, JsonLd, RatingStars, SectionHeading } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { formatMoney, formatNumber, localized, truncate } from "@/lib/utils";
import { getAuth } from "@/modules/auth/current-user";
import { getBadgeLabels, getMoreFromSupplier, getProductBySlug, getProductReviewStats, getSimilarProducts, getSupplierReviewSummary } from "@/modules/catalog/queries";
import { trackProductView } from "@/modules/catalog/service";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const title = localized(product as unknown as Record<string, unknown>, "title", locale);
  return pageMetadata({
    locale,
    path: `/product/${product.slug}`,
    title: product.seoTitle ?? title,
    description:
      product.seoDescription ??
      product.shortDescription ??
      t("product.metaDescription", { title, supplier: product.company.name, moq: formatNumber(product.moq, locale), unit: product.unit, lead: product.leadTimeDays ? t("product.days", { count: product.leadTimeDays }) : "—" }),
    image: product.images[0]?.url ?? null,
    type: "product",
  });
}

function priceRange(p: { priceType: string; basePrice: number | null; priceTiers: Array<{ price: number }> }) {
  const prices = p.priceTiers.map((t) => t.price);
  if (p.basePrice != null) prices.push(p.basePrice);
  if (!prices.length) return { low: null, high: null };
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [t, tc, auth, badgeLabels, reviewSummary, productReviews, more, similar, hdrs] = await Promise.all([
    getTranslations("marketplace"),
    getTranslations("common"),
    getAuth(),
    getBadgeLabels(locale),
    getSupplierReviewSummary(product.companyId),
    getProductReviewStats(product.id),
    getMoreFromSupplier(product.companyId, product.id, 6),
    getSimilarProducts(product.category.slug, product.id, 6),
    headers(),
  ]);

  // Fire-and-forget view counter + analytics event once the response is flushed.
  const referrer = hdrs.get("referer");
  after(() => trackProductView({ productId: product.id, companyId: product.companyId, path: `/${locale}/product/${product.slug}`, userId: auth?.user.id ?? null, referrer }));

  const title = localized(product as unknown as Record<string, unknown>, "title", locale);
  const description = localized(product as unknown as Record<string, unknown>, "description", locale);
  const company = product.company;
  const mp = company.manufacturerProfile;
  const { low, high } = priceRange(product);
  const badgeCodes = company.badges.filter((b) => !b.expiresAt || b.expiresAt > new Date()).map((b) => b.badge.code);
  const companyCertCodes = new Set(company.certifications.map((c) => c.certification.code));
  const certs = product.certifications.map((c) => c.certification);
  const categoryName = localized(product.category as unknown as Record<string, unknown>, "name", locale);
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.products"), href: "/products" },
    ...(product.category.parent ? [{ label: localized(product.category.parent as unknown as Record<string, unknown>, "name", locale), href: `/products/${product.category.parent.slug}` }] : []),
    { label: categoryName, href: product.category.parent ? `/products/${product.category.parent.slug}?sub=${product.category.slug}` : `/products/${product.category.slug}` },
    { label: title },
  ];
  const contactHref = `/buyer/messages/new?supplier=${company.slug}&product=${product.slug}`;
  const rfqHref = `/buyer/rfqs/new?product=${product.id}`;
  const location = [company.city, company.province ? localized(company.province as unknown as Record<string, unknown>, "name", locale) : null].filter(Boolean).join(", ");

  const priceHeadline = (() => {
    if (product.priceType === "CONTACT" || low == null) return t("product.contactForPrice");
    const lowS = formatMoney(low, product.currency, locale);
    if (high != null && high !== low) return `${lowS} – ${formatMoney(high, product.currency, locale)}`;
    return lowS;
  })();

  const facts = [
    { label: t("product.moq"), value: `${formatNumber(product.moq, locale)} ${product.unit}` },
    { label: t("product.leadTime"), value: product.leadTimeDays ? t("product.days", { count: product.leadTimeDays }) + (product.leadTimeNote ? ` · ${product.leadTimeNote}` : "") : t("product.notProvided") },
    {
      label: t("product.sample"),
      value: product.hasSample
        ? product.samplePrice != null && product.samplePrice > 0
          ? t("product.samplePriceLead", { price: formatMoney(product.samplePrice, product.currency, locale), days: product.sampleLeadDays ?? "—" })
          : product.sampleLeadDays
            ? `${t("product.sampleFree")} · ${t("product.days", { count: product.sampleLeadDays })}`
            : t("product.sampleFree")
        : t("product.noSample"),
    },
    { label: t("product.unit"), value: product.unit },
  ];

  return (
    <div className="container py-6 sm:py-8">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: String(c.label), path: c.href ?? `/product/${product.slug}` })), locale),
          productJsonLd({
            name: title,
            description: product.shortDescription ?? truncate(description, 300),
            image: product.images[0]?.url ?? null,
            slug: product.slug,
            sku: product.sku,
            brand: product.brand,
            currency: product.currency,
            lowPrice: low,
            highPrice: high,
            supplierName: company.name,
            supplierSlug: company.slug,
            locale,
          }),
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-5" />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Gallery */}
        <div className="lg:col-span-5">
          <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} title={title} photoSubject={product.title} photoSlug={product.slug} videoUrl={product.videoUrl} imageOfLabel={t.raw("product.imageOf")} />
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-steel-500">
            <Link href={`/products/${product.category.parent?.slug ?? product.category.slug}`} className="hover:text-ink-900">
              {categoryName}
            </Link>
            {product.isFeatured ? (
              <Badge variant="brass" size="sm">
                {t("listing.featured")}
              </Badge>
            ) : null}
            <span className="ml-auto inline-flex items-center gap-1">
              <Eye className="size-3.5" /> {t("product.views", { count: formatNumber(product.viewCount, locale) })}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-snug sm:text-3xl">{title}</h1>
          {product.shortDescription ? <p className="mt-2 text-sm text-steel-600">{product.shortDescription}</p> : null}

          <div className="mt-5 rounded-lg border border-steel-200 bg-steel-50 p-4">
            <p className="font-display text-2xl font-bold text-ink-900">
              {priceHeadline}
              {product.priceType !== "CONTACT" && low != null ? <span className="ml-1.5 text-sm font-normal text-steel-500">{t("product.perUnit", { unit: product.unit })}</span> : null}
            </p>
            {product.priceType === "NEGOTIABLE" ? <p className="mt-1 text-xs text-steel-500">{t("product.negotiable")}</p> : null}
            {product.priceType === "CONTACT" ? <p className="mt-1 text-xs text-steel-500">{t("product.contactPriceHint")}</p> : null}
            {product.priceTiers.length ? (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-steel-500">
                    <th className="pb-1 font-semibold">{t("product.quantity")}</th>
                    <th className="pb-1 text-right font-semibold">{t("product.unitPrice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.priceTiers.map((tier) => (
                    <tr key={tier.id} className="border-t border-steel-200">
                      <td className="py-1.5 text-ink-900">{tier.maxQty ? t("product.range", { min: formatNumber(tier.minQty, locale), max: formatNumber(tier.maxQty, locale) }) : t("product.andAbove", { min: formatNumber(tier.minQty, locale) })}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-ink-900">{formatMoney(tier.price, tier.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          <DataList items={facts} columns={2} className="mt-5" />

          <div className="mt-4 flex flex-wrap gap-1.5">
            {product.customizable ? <Badge variant="outline">{t("product.customizable")}</Badge> : null}
            {product.oemAvailable ? <Badge variant="ink">{t("product.oem")}</Badge> : null}
            {product.odmAvailable ? <Badge variant="ink">{t("product.odm")}</Badge> : null}
            {product.hasSample ? <Badge variant="success">{t("product.sampleAvailable")}</Badge> : null}
            {product.originCountry === "VN" ? (
              <Badge variant="brass">
                <MapPin className="size-3" /> {t("product.madeIn")}
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button href={rfqHref} size="lg" className="sm:col-span-2">
              <FileText /> {t("product.requestQuotation")}
            </Button>
            <Button href={contactHref} variant="secondary" size="lg">
              <MessageSquare /> {t("product.contactSupplier")}
            </Button>
            <SaveControl auth={auth} kind="product" id={product.id} returnTo={`/product/${product.slug}`} label={t("product.save")} savedLabel={tc("actions.saved")} size="lg" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-steel-500">
            <ShareButton title={title} label={t("product.share")} copiedLabel={tc("actions.saved")} size="sm" />
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-success-600" /> {tc("trust.tradeAssurance")}
            </span>
          </div>
        </div>

        {/* Supplier card */}
        <aside className="lg:col-span-3">
          <Card>
            <CardHeader title={t("product.supplier")} />
            <CardContent>
              <div className="flex items-start gap-3">
                <Avatar name={company.name} src={company.logoUrl} size={48} square className="border border-steel-200" />
                <div className="min-w-0">
                  <Link href={`/supplier/${company.slug}`} className="flex items-center gap-1.5 font-semibold text-ink-900 hover:underline">
                    <span className="truncate">{localized(company as unknown as Record<string, unknown>, "name", locale)}</span>
                    <VerifiedMark status={company.verificationStatus} />
                  </Link>
                  {location ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-steel-500">
                      <MapPin className="size-3" /> {location}
                    </p>
                  ) : null}
                </div>
              </div>
              {company.verificationStatus === "VERIFIED" ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-success-50 px-2 py-1 text-xs font-medium text-success-700">
                  <BadgeCheck className="size-3.5" /> {t("product.verifiedSupplier")}
                </p>
              ) : null}
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-steel-500">{tc("labels.rating")}</span>
                  <RatingStars value={company.ratingAvg} count={company.ratingCount} />
                </div>
                {company.responseRate != null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-steel-500">{t("product.responseRate")}</span>
                    <span className="font-medium text-ink-900">{Math.round(company.responseRate)}%</span>
                  </div>
                ) : null}
                {company.yearEstablished ? (
                  <div className="flex items-center justify-between">
                    <span className="text-steel-500">{tc("labels.yearEstablished")}</span>
                    <span className="font-medium text-ink-900">{company.yearEstablished}</span>
                  </div>
                ) : null}
                {mp?.avgLeadTimeDays ? (
                  <div className="flex items-center justify-between">
                    <span className="text-steel-500">{tc("labels.leadTime")}</span>
                    <span className="font-medium text-ink-900">{t("product.days", { count: mp.avgLeadTimeDays })}</span>
                  </div>
                ) : null}
              </div>
              {badgeCodes.length ? <TrustBadges codes={badgeCodes} labels={badgeLabels} size="sm" className="mt-3" /> : null}
              <div className="mt-4 space-y-2">
                <Button href={`/supplier/${company.slug}`} variant="secondary" size="sm" className="w-full">
                  <Factory /> {t("product.viewProfile")}
                </Button>
                <Button href={`/supplier/${company.slug}?tab=reviews`} variant="ghost" size="sm" className="w-full">
                  {t("product.reviews", { count: reviewSummary.count })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Detail sections */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          <section id="description">
            <SectionHeading title={t("product.description")} />
            {description ? (
              <div className="prose-cang whitespace-pre-line text-sm sm:text-base">{description}</div>
            ) : (
              <p className="text-sm text-steel-500">{t("product.notProvided")}</p>
            )}
          </section>

          <section id="specifications">
            <SectionHeading title={t("product.specifications")} />
            {product.specifications.length ? (
              <Table>
                <TBody>
                  {product.specifications.map((s) => (
                    <TR key={s.id}>
                      <TH scope="row" className="w-1/3 bg-steel-50 text-xs font-semibold uppercase tracking-wide text-steel-500">
                        {s.name}
                      </TH>
                      <TD>
                        {s.value}
                        {s.unit ? ` ${s.unit}` : ""}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-steel-500">{t("product.noSpecs")}</p>
            )}
          </section>

          <section id="variants">
            <SectionHeading title={t("product.variants")} />
            {product.variants.length ? (
              <Table>
                <THead>
                  <TR>
                    <TH>{t("product.variants")}</TH>
                    <TH>{t("product.variantSku")}</TH>
                    <TH className="text-right">{t("product.variantPrice")}</TH>
                    <TH className="text-right">{t("product.variantMoq")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {product.variants.map((v) => (
                    <TR key={v.id}>
                      <TD>
                        <span className="font-medium">{v.name}</span>
                        {Object.keys(v.attributes).length ? (
                          <span className="ml-2 text-xs text-steel-500">
                            {Object.entries(v.attributes)
                              .map(([k, val]) => `${k}: ${val}`)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </TD>
                      <TD className="font-mono text-xs text-steel-600">{v.sku ?? "—"}</TD>
                      <TD className="text-right tabular-nums">{v.price != null ? formatMoney(v.price, product.currency, locale) : "—"}</TD>
                      <TD className="text-right tabular-nums">{v.moq != null ? formatNumber(v.moq, locale) : "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-steel-500">{t("product.noVariants")}</p>
            )}
          </section>

          <section id="packaging">
            <SectionHeading title={t("product.packaging")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-steel-200 bg-white p-4">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">
                  <Package className="size-3.5" /> {t("product.packagingDetails")}
                </p>
                <p className="text-sm text-ink-900">{product.packagingDetails ?? t("product.notProvided")}</p>
              </div>
              <div className="rounded-lg border border-steel-200 bg-white p-4">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">
                  <Truck className="size-3.5" /> {t("product.shippingInfo")}
                </p>
                <p className="text-sm text-ink-900">{product.shippingInfo ?? t("product.notProvided")}</p>
              </div>
            </div>
          </section>

          <section id="trade">
            <SectionHeading title={t("product.trade")} />
            <DataList
              columns={3}
              items={[
                { label: t("product.hsCode"), value: product.hsCode ?? t("product.notProvided") },
                { label: t("product.origin"), value: product.originCountry === "VN" ? t("product.madeIn") : product.originCountry },
                { label: t("product.brand"), value: product.brand ?? t("product.notProvided") },
                { label: t("product.model"), value: product.model ?? t("product.notProvided") },
                { label: t("product.sku"), value: product.sku ?? t("product.notProvided") },
                { label: tc("labels.category"), value: categoryName },
              ]}
            />
          </section>

          <section id="certifications">
            <SectionHeading title={t("product.certifications")} />
            {certs.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {certs.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded-lg border border-steel-200 bg-white p-3">
                    <ShieldCheck className={companyCertCodes.has(c.code) ? "mt-0.5 size-5 shrink-0 text-success-600" : "mt-0.5 size-5 shrink-0 text-steel-400"} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                      <p className="text-xs text-steel-500">{[c.issuingBody, c.category].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-steel-500">{t("product.noCertifications")}</p>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader title={t("product.keyFacts")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("product.moq"), value: `${formatNumber(product.moq, locale)} ${product.unit}` },
                  { label: t("product.leadTime"), value: product.leadTimeDays ? t("product.days", { count: product.leadTimeDays }) : t("product.notProvided") },
                  { label: t("product.hsCode"), value: product.hsCode ?? t("product.notProvided") },
                  { label: t("product.origin"), value: product.originCountry === "VN" ? t("product.madeIn") : product.originCountry },
                  { label: tc("labels.paymentTerms"), value: mp?.paymentTermsAccepted.length ? mp.paymentTermsAccepted.join(", ") : t("product.notProvided") },
                  { label: tc("labels.incoterm"), value: mp?.acceptedIncoterms.length ? mp.acceptedIncoterms.join(", ") : t("product.notProvided") },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={tc("labels.reviews")} description={t("product.reviews", { count: reviewSummary.count })} />
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold text-ink-900">{reviewSummary.count ? reviewSummary.average.toFixed(1) : "–"}</span>
                <RatingStars value={reviewSummary.average} showValue={false} size={16} />
              </div>
              {productReviews.count ? <p className="mt-2 text-xs text-steel-500">{t("product.reviews", { count: productReviews.count })} · {productReviews.average.toFixed(1)} ★</p> : null}
              <Link href={`/supplier/${company.slug}?tab=reviews`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink-700 hover:underline">
                <Clock className="size-3.5" /> {t("product.readReviews")}
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>

      {more.length ? (
        <section className="mt-14">
          <SectionHeading title={t("product.moreFromSupplier", { name: company.name })} action={<Link href={`/supplier/${company.slug}?tab=products`} className="font-medium text-ink-700 hover:underline">{tc("actions.viewAll")} →</Link>} />
          <ProductGrid products={more} columns={6} compact />
        </section>
      ) : null}
      {similar.length ? (
        <section className="mt-12">
          <SectionHeading title={t("product.similarProducts")} action={<Link href={`/products/${product.category.parent?.slug ?? product.category.slug}`} className="font-medium text-ink-700 hover:underline">{tc("actions.viewAll")} →</Link>} />
          <ProductGrid products={similar} columns={6} compact />
        </section>
      ) : null}
    </div>
  );
}
