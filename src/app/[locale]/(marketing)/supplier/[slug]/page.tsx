import { BadgeCheck, Building2, Clock, FileText, Globe2, MapPin, MessageSquare, PlayCircle, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BannerImage } from "@/components/marketplace/banner";
import { ChipLink } from "@/components/marketplace/filter-fields";
import { ProductGrid } from "@/components/marketplace/grids";
import { countryName } from "@/components/marketplace/labels";
import { DimensionRatings, RatingDistribution, ReviewCard } from "@/components/marketplace/reviews";
import { SaveControl } from "@/components/marketplace/save-control";
import { ShareButton } from "@/components/marketplace/share-button";
import { Badge, StatusBadge, TrustBadges, VerifiedMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent, CardHeader, DataList, EmptyState, StatCard } from "@/components/ui/card";
import { Avatar, Breadcrumbs, JsonLd, LinkTabs, Pagination, RatingStars, SectionHeading } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { isPlaceholderSrc } from "@/lib/placeholder-art";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, supplierJsonLd } from "@/lib/seo";
import { employeeRangeLabel, formatDate, formatMoney, formatNumber, humanize, localized } from "@/lib/utils";
import { getAuth } from "@/modules/auth/current-user";
import { first, type SearchParams } from "@/modules/catalog/filters";
import { getBadgeLabels, getSupplierBySlug, getSupplierProducts, getSupplierReviewSummary, getSupplierReviews, type SupplierDetail } from "@/modules/catalog/queries";
import { trackSupplierView } from "@/modules/catalog/service";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SearchParams> };
const TABS = ["overview", "products", "factory", "certifications", "reviews", "transactions"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams]);
  const supplier = await getSupplierBySlug(slug);
  if (!supplier) return {};
  const t = await getTranslations({ locale, namespace: "marketplace" });
  const name = localized(supplier as unknown as Record<string, unknown>, "name", locale);
  const tab = first(sp.tab);
  const location = [supplier.city, supplier.province ? localized(supplier.province as unknown as Record<string, unknown>, "name", locale) : null].filter(Boolean).join(", ");
  return pageMetadata({
    locale,
    path: `/supplier/${supplier.slug}`,
    title: supplier.seoTitle ?? (tab && tab !== "overview" ? `${name} · ${t(`supplier.tabs.${tab}`)}` : name),
    description: supplier.seoDescription ?? supplier.tagline ?? t("supplier.metaDescription", { name, type: humanize(supplier.businessType), location, products: supplier.productCount, rating: supplier.ratingAvg.toFixed(1), reviews: supplier.ratingCount }),
    image: supplier.coverUrl ?? supplier.logoUrl ?? null,
  });
}

function volumeBand(v: number): "none" | "lt10k" | "10k" | "100k" | "1m" {
  if (v <= 0) return "none";
  if (v < 10_000) return "lt10k";
  if (v < 100_000) return "10k";
  if (v < 1_000_000) return "100k";
  return "1m";
}

export default async function SupplierPage({ params, searchParams }: Props) {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const supplier = await getSupplierBySlug(slug);
  if (!supplier) notFound();
  const tab: Tab = (TABS as readonly string[]).includes(first(sp.tab) ?? "") ? (first(sp.tab) as Tab) : "overview";
  const page = Math.max(1, Number(first(sp.page) ?? 1) || 1);
  const [t, tc, auth, badgeLabels, reviewSummary, hdrs] = await Promise.all([
    getTranslations("marketplace"),
    getTranslations("common"),
    getAuth(),
    getBadgeLabels(locale),
    getSupplierReviewSummary(supplier.id),
    headers(),
  ]);
  const referrer = hdrs.get("referer");
  after(() => trackSupplierView({ companyId: supplier.id, path: `/${locale}/supplier/${supplier.slug}`, userId: auth?.user.id ?? null, referrer }));

  const name = localized(supplier as unknown as Record<string, unknown>, "name", locale);
  const altName = locale === "vi" ? supplier.name : supplier.nameVi;
  const mp = supplier.manufacturerProfile;
  const provinceName = supplier.province ? localized(supplier.province as unknown as Record<string, unknown>, "name", locale) : null;
  const location = [supplier.city, provinceName, supplier.country ? localized(supplier.country as unknown as Record<string, unknown>, "name", locale) : null].filter(Boolean).join(", ");
  const badgeCodes = supplier.badges.filter((b) => !b.expiresAt || b.expiresAt > new Date()).map((b) => b.badge.code);
  const description = localized(supplier as unknown as Record<string, unknown>, "description", locale);
  const tagline = localized(supplier as unknown as Record<string, unknown>, "tagline", locale);
  const contactHref = `/buyer/messages/new?supplier=${supplier.slug}`;
  const rfqHref = `/buyer/rfqs/new?supplier=${supplier.id}`;
  const path = `/supplier/${supplier.slug}`;
  const tabHref = (value: Tab) => (value === "overview" ? path : `${path}?tab=${value}`);
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.manufacturers"), href: "/manufacturers" },
    ...(supplier.industries[0] ? [{ label: localized(supplier.industries[0].industry as unknown as Record<string, unknown>, "name", locale), href: `/manufacturers/${supplier.industries[0].industry.slug}` }] : []),
    { label: name },
  ];
  const notProvided = t("supplier.notProvided");
  // Seeded factory photos pointed at a dead image host. A stock picture would pass for this
  // supplier's own plant, so dead links are dropped and the tab says no photos yet.
  const photos = supplier.media.filter((m) => m.kind !== "VIDEO" && !isPlaceholderSrc(m.url));
  const videos = [...supplier.media.filter((m) => m.kind === "VIDEO").map((m) => m.url), ...(mp?.videoUrls ?? [])];

  return (
    <div className="pb-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: String(c.label), path: c.href ?? path })), locale),
          supplierJsonLd({
            name: supplier.name,
            description: supplier.tagline ?? supplier.description,
            logo: supplier.logoUrl,
            slug: supplier.slug,
            city: supplier.city,
            province: supplier.province?.name ?? null,
            countryCode: supplier.countryCode,
            yearEstablished: supplier.yearEstablished,
            ratingAvg: supplier.ratingAvg,
            ratingCount: supplier.ratingCount,
            locale,
          }),
        ]}
      />

      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-ink-900 sm:h-56 lg:h-64">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" aria-hidden />
        <div className="absolute inset-0 opacity-70">
          <BannerImage src={supplier.coverUrl} alt="" photo={supplier.tagline} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" aria-hidden />
      </div>

      {/* Identity */}
      <div className="container">
        <div className="relative z-10 -mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
          <Avatar name={supplier.name} src={supplier.logoUrl} size={96} square className="border-4 border-white bg-white shadow-card" />
          <div className="min-w-0 flex-1 pb-1 sm:pt-12">
            <Breadcrumbs items={crumbs} className="mb-2 hidden sm:block" />
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold sm:text-3xl">
              {name}
              <VerifiedMark status={supplier.verificationStatus} className="size-6" />
            </h1>
            {altName ? <p className="text-sm text-steel-500">{altName}</p> : null}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-steel-600">
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-4" /> {humanize(supplier.businessType)}
              </span>
              {location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" /> {location}
                </span>
              ) : null}
              <RatingStars value={supplier.ratingAvg} count={supplier.ratingCount} />
              {supplier.responseRate != null ? (
                <span>
                  {t("supplier.responseRate")} <span className="font-medium text-ink-900">{Math.round(supplier.responseRate)}%</span>
                </span>
              ) : null}
            </p>
            {tagline ? <p className="mt-2 max-w-2xl text-steel-700">{tagline}</p> : null}
            {badgeCodes.length ? <TrustBadges codes={badgeCodes} labels={badgeLabels} className="mt-3" /> : null}
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 mt-5 border-y border-steel-200 bg-white/95 backdrop-blur">
        <div className="container flex items-center gap-3 py-2.5">
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <Avatar name={supplier.name} src={supplier.logoUrl} size={28} square />
            <span className="truncate text-sm font-semibold text-ink-900">{name}</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ShareButton title={name} label={t("product.share")} copiedLabel={tc("actions.saved")} size="sm" className="hidden sm:inline-flex" />
            <SaveControl auth={auth} kind="supplier" id={supplier.id} returnTo={path} label={t("supplier.save")} savedLabel={tc("actions.saved")} size="sm" variant="ghost" compactLabel />
            <Button href={contactHref} variant="secondary" size="sm">
              <MessageSquare /> {t("supplier.contact")}
            </Button>
            <Button href={rfqHref} size="sm">
              <FileText /> {t("supplier.requestQuotation")}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mt-6">
        <LinkTabs
          current={tab}
          tabs={[
            { value: "overview", label: t("supplier.tabs.overview"), href: tabHref("overview") },
            { value: "products", label: t("supplier.tabs.products"), href: tabHref("products"), count: supplier.productCount },
            { value: "factory", label: t("supplier.tabs.factory"), href: tabHref("factory") },
            { value: "certifications", label: t("supplier.tabs.certifications"), href: tabHref("certifications"), count: supplier.certifications.length },
            { value: "reviews", label: t("supplier.tabs.reviews"), href: tabHref("reviews"), count: reviewSummary.count },
            { value: "transactions", label: t("supplier.tabs.transactions"), href: tabHref("transactions") },
          ]}
        />

        <div className="mt-8">
          {tab === "overview" ? <OverviewTab supplier={supplier} locale={locale} description={description} notProvided={notProvided} /> : null}
          {tab === "products" ? <ProductsTab supplier={supplier} page={page} q={first(sp.q)} path={path} /> : null}
          {tab === "factory" ? <FactoryTab supplier={supplier} locale={locale} photos={photos} videos={videos} notProvided={notProvided} /> : null}
          {tab === "certifications" ? <CertificationsTab supplier={supplier} locale={locale} /> : null}
          {tab === "reviews" ? <ReviewsTab supplier={supplier} locale={locale} page={page} path={path} summary={reviewSummary} /> : null}
          {tab === "transactions" ? <TransactionsTab supplier={supplier} locale={locale} /> : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function VerificationBlock({ supplier, locale }: { supplier: SupplierDetail; locale: string }) {
  const t = await getTranslations("marketplace");
  if (supplier.verificationStatus === "VERIFIED") {
    return (
      <Alert variant="success" title={supplier.verifiedAt ? t("supplier.verifiedOn", { date: formatDate(supplier.verifiedAt, locale) }) : t("supplier.verified")}>
        <span className="inline-flex items-start gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0" /> {t("supplier.verifiedBody")}
        </span>
      </Alert>
    );
  }
  if (supplier.verificationStatus === "PENDING" || supplier.verificationStatus === "IN_REVIEW") {
    return (
      <Alert variant="info" title={t("supplier.pending")}>
        {t("supplier.pendingBody")}
      </Alert>
    );
  }
  return (
    <Alert variant="warning" title={t("supplier.unverified")}>
      <span className="inline-flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" /> {t("supplier.unverifiedBody")}
      </span>
    </Alert>
  );
}

async function OverviewTab({ supplier, locale, description, notProvided }: { supplier: SupplierDetail; locale: string; description: string; notProvided: string }) {
  const [t, products] = await Promise.all([getTranslations("marketplace"), getSupplierProducts(supplier.id, { pageSize: 6 })]);
  const mp = supplier.manufacturerProfile;
  const name = localized(supplier as unknown as Record<string, unknown>, "name", locale);
  const facts = [
    { label: t("supplier.established"), value: supplier.yearEstablished ?? notProvided },
    { label: t("supplier.employees"), value: supplier.employeeRange ? employeeRangeLabel(supplier.employeeRange) : notProvided },
    { label: t("supplier.factorySize"), value: mp?.factorySizeSqm ? t("supplier.sqm", { value: formatNumber(mp.factorySizeSqm, locale) }) : notProvided },
    { label: t("supplier.productionLines"), value: mp?.productionLines ? t("supplier.lines", { count: mp.productionLines }) : notProvided },
    { label: t("supplier.annualCapacity"), value: mp?.annualCapacity ?? (mp?.annualCapacityValue ? `${formatNumber(mp.annualCapacityValue, locale)} ${mp.annualCapacityUnit ?? ""}` : notProvided) },
    { label: t("supplier.exportShare"), value: mp?.exportPercentage != null ? `${mp.exportPercentage}%` : notProvided },
    { label: t("supplier.exportExperience"), value: mp?.exportExperienceYears ? t("supplier.years", { count: mp.exportExperienceYears }) : notProvided },
    { label: t("supplier.exportCountries"), value: mp?.exportCountries.length ? mp.exportCountries.map((c) => countryName(c, locale)).join(", ") : notProvided },
    { label: t("supplier.mainMarkets"), value: mp?.mainMarkets.length ? mp.mainMarkets.join(", ") : notProvided },
    { label: t("supplier.languages"), value: supplier.languages.length ? supplier.languages.map((l) => l.toUpperCase()).join(", ") : notProvided },
    { label: t("supplier.paymentTerms"), value: mp?.paymentTermsAccepted.length ? mp.paymentTermsAccepted.join(", ") : notProvided },
    { label: t("supplier.incoterms"), value: mp?.acceptedIncoterms.length ? mp.acceptedIncoterms.join(", ") : notProvided },
    { label: t("supplier.rdStaff"), value: mp?.rdStaffCount != null ? t("supplier.people", { count: mp.rdStaffCount }) : notProvided },
    { label: t("supplier.qcStaff"), value: mp?.qcStaffCount != null ? t("supplier.people", { count: mp.qcStaffCount }) : notProvided },
    { label: t("supplier.mainEquipment"), value: mp?.mainEquipment ?? notProvided },
    { label: t("supplier.mainMaterials"), value: mp?.mainMaterials ?? notProvided },
    { label: t("supplier.sampleLeadTime"), value: mp?.sampleLeadTimeDays ? t("supplier.days", { count: mp.sampleLeadTimeDays }) : notProvided },
    { label: t("supplier.avgLeadTime"), value: mp?.avgLeadTimeDays ? t("supplier.days", { count: mp.avgLeadTimeDays }) : notProvided },
    { label: t("supplier.minOrderValue"), value: mp?.minOrderValueUsd ? formatMoney(mp.minOrderValueUsd, "USD", locale) : notProvided },
    { label: t("supplier.website"), value: supplier.website ? <a href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer nofollow" className="text-ink-700 underline-offset-2 hover:underline">{supplier.website.replace(/^https?:\/\//, "")}</a> : notProvided },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-8">
        <section>
          <SectionHeading title={t("supplier.about", { name })} />
          {description ? <div className="prose-cang whitespace-pre-line text-sm sm:text-base">{description}</div> : <p className="text-sm text-steel-500">{t("supplier.noDescription")}</p>}
        </section>
        <section>
          <SectionHeading title={t("supplier.keyFacts")} />
          <DataList items={facts} columns={2} />
        </section>
        <section>
          <SectionHeading title={t("supplier.capabilities")} />
          <div className="flex flex-wrap gap-2">
            <Badge variant={mp?.oemCapable ? "ink" : "outline"} size="lg">{t("supplier.oemCapable")}</Badge>
            <Badge variant={mp?.odmCapable ? "ink" : "outline"} size="lg">{t("supplier.odmCapable")}</Badge>
            <Badge variant={mp?.privateLabelCapable ? "ink" : "outline"} size="lg">{t("supplier.privateLabel")}</Badge>
            <Badge variant={mp?.factoryTourAvailable ? "success" : "outline"} size="lg">{t("supplier.factoryTour")}</Badge>
          </div>
        </section>
        {products.hits.length ? (
          <section>
            <SectionHeading title={t("supplier.tabs.products")} action={<Link href={`/supplier/${supplier.slug}?tab=products`} className="font-medium text-ink-700 hover:underline">{t("supplier.viewAllProducts")} →</Link>} />
            <ProductGrid products={products.hits} columns={3} compact />
          </section>
        ) : null}
      </div>
      <aside className="space-y-5 lg:col-span-4">
        <VerificationBlock supplier={supplier} locale={locale} />
        {supplier.industries.length ? (
          <Card>
            <CardHeader title={t("supplier.industries")} />
            <CardContent className="flex flex-wrap gap-2">
              {supplier.industries.map((ci) => (
                <ChipLink key={ci.industryId} href={`/manufacturers/${ci.industry.slug}${supplier.province ? `/${supplier.province.slug}` : ""}`}>
                  {localized(ci.industry as unknown as Record<string, unknown>, "name", locale)}
                </ChipLink>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {supplier.certifications.length ? (
          <Card>
            <CardHeader title={t("supplier.certifications")} action={<Link href={`/supplier/${supplier.slug}?tab=certifications`} className="text-sm font-medium text-ink-700 hover:underline">{t("manufacturers.viewAll")}</Link>} />
            <CardContent className="flex flex-wrap gap-1.5">
              {supplier.certifications.map((c) => (
                <Badge key={c.id} variant={c.status === "VERIFIED" ? "success" : "neutral"}>
                  {c.status === "VERIFIED" ? <ShieldCheck className="size-3" /> : null}
                  {c.certification.name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader title={t("supplier.location")} />
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-start gap-2 text-ink-900">
              <MapPin className="mt-0.5 size-4 shrink-0 text-steel-400" />
              <span>
                {supplier.address ? <>{supplier.address}<br /></> : null}
                {[supplier.city, supplier.province?.name].filter(Boolean).join(", ")}, {countryName(supplier.countryCode, locale)}
              </span>
            </p>
            {supplier.province?.isIndustrialCluster ? (
              <Link href={`/clusters/${supplier.province.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-700 hover:underline">
                <Globe2 className="size-4" /> {t("clusters.viewCluster")}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

async function ProductsTab({ supplier, page, q, path }: { supplier: SupplierDetail; page: number; q?: string; path: string }) {
  const [t, result] = await Promise.all([getTranslations("marketplace"), getSupplierProducts(supplier.id, { page, q, pageSize: 24 })]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900">{t("supplier.products.count", { count: result.total })}</p>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="tab" value="products" />
          <input type="search" name="q" defaultValue={q ?? ""} placeholder={t("filters.keywordPlaceholder")} aria-label={t("filters.keyword")} className="h-9 w-56 rounded-md border border-steel-300 px-3 text-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100" />
          <Button type="submit" variant="secondary" size="sm">{t("listing.apply")}</Button>
        </form>
      </div>
      {result.hits.length ? (
        <ProductGrid products={result.hits} columns={4} />
      ) : (
        <EmptyState title={t("supplier.products.noProducts")} description={t("supplier.products.noProductsHint")} action={<Button href={`/buyer/rfqs/new?supplier=${supplier.id}`} size="sm">{t("supplier.requestQuotation")}</Button>} />
      )}
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => `${path}?tab=products${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`} />
    </div>
  );
}

async function FactoryTab({ supplier, locale, photos, videos, notProvided }: { supplier: SupplierDetail; locale: string; photos: SupplierDetail["media"]; videos: string[]; notProvided: string }) {
  const t = await getTranslations("marketplace");
  const mp = supplier.manufacturerProfile;
  return (
    <div className="space-y-10">
      <section>
        <SectionHeading title={t("supplier.photos")} />
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((m) => (
              <figure key={m.id} className="overflow-hidden rounded-lg border border-steel-200 bg-steel-50">
                <div className="relative aspect-[4/3]">
                  <SmartImage src={m.url} alt={m.caption ?? supplier.name} fill fallbackLabel={m.caption ?? undefined} />
                </div>
                {m.caption ? <figcaption className="px-3 py-2 text-xs text-steel-600">{m.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Video />} title={t("supplier.noMedia")} />
        )}
      </section>
      {videos.length ? (
        <section>
          <SectionHeading title={t("supplier.videos")} />
          <ul className="flex flex-wrap gap-2">
            {videos.map((v) => (
              <li key={v}>
                <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-md border border-steel-300 bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-steel-50">
                  <PlayCircle className="size-4 text-brass-600" /> {t("supplier.watchVideo")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <SectionHeading title={t("supplier.tabs.factory")} />
        <DataList
          columns={2}
          items={[
            { label: t("supplier.factoryAddress"), value: mp?.factoryAddress ?? supplier.address ?? notProvided },
            { label: t("supplier.factorySize"), value: mp?.factorySizeSqm ? t("supplier.sqm", { value: formatNumber(mp.factorySizeSqm, locale) }) : notProvided },
            { label: t("supplier.productionLines"), value: mp?.productionLines ? t("supplier.lines", { count: mp.productionLines }) : notProvided },
            { label: t("supplier.annualCapacity"), value: mp?.annualCapacity ?? notProvided },
            { label: t("supplier.mainEquipment"), value: mp?.mainEquipment ?? notProvided },
            { label: t("supplier.mainMaterials"), value: mp?.mainMaterials ?? notProvided },
            { label: t("supplier.factoryTour"), value: mp?.factoryTourAvailable ? t("supplier.factoryTourYes") : t("supplier.factoryTourNo") },
            { label: t("supplier.qcStaff"), value: mp?.qcStaffCount != null ? t("supplier.people", { count: mp.qcStaffCount }) : notProvided },
          ]}
        />
      </section>
      <section>
        <SectionHeading title={t("supplier.auditHistory")} />
        {supplier.verifications.length ? (
          <Table>
            <THead>
              <TR>
                <TH>{t("supplier.auditType")}</TH>
                <TH>{t("supplier.auditStatus")}</TH>
                <TH>{t("supplier.auditDate")}</TH>
                <TH>{t("supplier.auditExpires")}</TH>
              </TR>
            </THead>
            <TBody>
              {supplier.verifications.map((v) => (
                <TR key={v.id}>
                  <TD className="font-medium">{humanize(v.type)}</TD>
                  <TD><StatusBadge status={v.status} /></TD>
                  <TD>{formatDate(v.reviewedAt ?? v.submittedAt, locale)}</TD>
                  <TD>{v.expiresAt ? formatDate(v.expiresAt, locale) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="text-sm text-steel-500">{t("supplier.noAudits")}</p>
        )}
      </section>
    </div>
  );
}

async function CertificationsTab({ supplier, locale }: { supplier: SupplierDetail; locale: string }) {
  const t = await getTranslations("marketplace");
  if (!supplier.certifications.length) return <EmptyState icon={<ShieldCheck />} title={t("supplier.noCerts")} />;
  return (
    <Table>
      <THead>
        <TR>
          <TH>{t("supplier.certName")}</TH>
          <TH>{t("supplier.certCategory")}</TH>
          <TH>{t("supplier.certIssuer")}</TH>
          <TH>{t("supplier.certNumber")}</TH>
          <TH>{t("supplier.certIssued")}</TH>
          <TH>{t("supplier.certExpires")}</TH>
          <TH>{t("supplier.certStatus")}</TH>
        </TR>
      </THead>
      <TBody>
        {supplier.certifications.map((c) => (
          <TR key={c.id}>
            <TD className="font-medium">{c.certification.name}</TD>
            <TD className="capitalize text-steel-600">{c.certification.category ?? "—"}</TD>
            <TD className="text-steel-600">{c.certification.issuingBody ?? "—"}</TD>
            <TD className="font-mono text-xs text-steel-600">{c.certificateNumber ?? "—"}</TD>
            <TD>{c.issuedAt ? formatDate(c.issuedAt, locale) : "—"}</TD>
            <TD>{c.expiresAt ? formatDate(c.expiresAt, locale) : "—"}</TD>
            <TD><StatusBadge status={c.status} /></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

async function ReviewsTab({ supplier, locale, page, path, summary }: { supplier: SupplierDetail; locale: string; page: number; path: string; summary: Awaited<ReturnType<typeof getSupplierReviewSummary>> }) {
  const [t, reviews] = await Promise.all([getTranslations("marketplace"), getSupplierReviews(supplier.id, { page, pageSize: 10 })]);
  const name = localized(supplier as unknown as Record<string, unknown>, "name", locale);
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <aside className="space-y-5 lg:col-span-4">
        <Card>
          <CardHeader title={t("supplier.reviews.title")} description={t("supplier.reviews.count", { count: summary.count })} />
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="font-display text-5xl font-bold leading-none text-ink-900">{summary.count ? summary.average.toFixed(1) : "–"}</span>
              <div>
                <RatingStars value={summary.average} showValue={false} size={18} />
                {summary.count ? <p className="mt-1 text-xs text-steel-500">{t("supplier.reviews.verifiedShare", { percent: Math.round(summary.verifiedShare * 100) })}</p> : null}
              </div>
            </div>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("supplier.reviews.distribution")}</p>
            <RatingDistribution summary={summary} starLabel={(n) => t("supplier.reviews.stars", { count: n })} />
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("supplier.reviews.dimensions")}</p>
            <DimensionRatings
              summary={summary}
              labels={{ quality: t("supplier.reviews.quality"), communication: t("supplier.reviews.communication"), delivery: t("supplier.reviews.delivery"), accuracy: t("supplier.reviews.accuracy"), service: t("supplier.reviews.service") }}
            />
          </CardContent>
        </Card>
      </aside>
      <div className="space-y-4 lg:col-span-8">
        {reviews.rows.length ? (
          reviews.rows.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              locale={locale}
              labels={{ verified: t("supplier.reviews.verifiedPurchase"), replyFrom: t("supplier.reviews.reply", { name }), buyerFrom: t.raw("supplier.reviews.buyerFrom"), about: t.raw("supplier.reviews.about"), anonymous: t("supplier.reviews.anonymousBuyer") }}
            />
          ))
        ) : (
          <EmptyState icon={<Clock />} title={t("supplier.reviews.noReviews")} description={t("supplier.reviews.noReviewsHint")} />
        )}
        <Pagination page={reviews.page} totalPages={reviews.totalPages} hrefFor={(p) => `${path}?tab=reviews${p > 1 ? `&page=${p}` : ""}`} />
      </div>
    </div>
  );
}

async function TransactionsTab({ supplier, locale }: { supplier: SupplierDetail; locale: string }) {
  const t = await getTranslations("marketplace");
  const band = volumeBand(supplier.transactionVolumeUsd);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("supplier.transactions.count")} value={formatNumber(supplier.transactionCount, locale)} />
        <StatCard label={t("supplier.transactions.volume")} value={t(`supplier.transactions.band.${band}`)} />
        <StatCard label={t("supplier.transactions.rating")} value={supplier.ratingCount ? supplier.ratingAvg.toFixed(1) : "–"} hint={t("supplier.reviewsLabel", { count: supplier.ratingCount })} />
        <StatCard label={t("supplier.transactions.responseRate")} value={supplier.responseRate != null ? `${Math.round(supplier.responseRate)}%` : "–"} />
        <StatCard label={t("supplier.transactions.responseTime")} value={supplier.avgResponseHours != null ? t("supplier.transactions.hours", { count: Math.round(supplier.avgResponseHours) }) : "–"} />
        <StatCard label={t("supplier.transactions.memberSince")} value={formatDate(supplier.createdAt, locale, { year: "numeric", month: "short" })} />
      </div>
      {supplier.transactionCount === 0 ? <Alert variant="info">{t("supplier.transactions.noTransactions")}</Alert> : null}
      <p className="text-xs text-steel-500">{t("supplier.transactions.hint")}</p>
    </div>
  );
}
