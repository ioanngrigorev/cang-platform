/**
 * Step 1 — users and companies: 32 suppliers + 6 buyers with profiles, industries, certifications,
 * media, badges, verifications, compliance checks, subscriptions and memberships.
 * Mirrors the side effects of `createCompanyForUser` with direct bulk inserts.
 */
import type { Db } from "@/db";
import {
  buyerProfiles,
  companies,
  companyBadges,
  companyCertifications,
  companyIndustries,
  companyMedia,
  companyMembers,
  complianceChecks,
  manufacturerProfiles,
  subscriptions,
  users,
  verifications,
} from "@/db/schema";
import { CERTIFICATIONS } from "../data/reference";
import { BUYERS } from "../data/buyers";
import { SUPPLIERS } from "../data/suppliers";
import { insertAll, type World } from "./context";
import { composeCompanyDescription } from "./text";

type UserRow = typeof users.$inferInsert;
type CompanyRow = typeof companies.$inferInsert;
type MemberRow = typeof companyMembers.$inferInsert;
type ManufacturerRow = typeof manufacturerProfiles.$inferInsert;
type BuyerProfileRow = typeof buyerProfiles.$inferInsert;
type IndustryRow = typeof companyIndustries.$inferInsert;
type CertRow = typeof companyCertifications.$inferInsert;
type MediaRow = typeof companyMedia.$inferInsert;
type BadgeRow = typeof companyBadges.$inferInsert;
type VerificationRow = typeof verifications.$inferInsert;
type ComplianceRow = typeof complianceChecks.$inferInsert;
type SubscriptionRow = typeof subscriptions.$inferInsert;

const CERT_NAME = new Map(CERTIFICATIONS.map((c) => [c.code, c.name]));

const MEDIA_CAPTIONS: Array<[string, string]> = [
  ["Main production hall", "Xưởng sản xuất chính"],
  ["Production line during a customer audit", "Dây chuyền sản xuất trong buổi kiểm định của khách hàng"],
  ["Finished goods warehouse before container loading", "Kho thành phẩm trước khi đóng container"],
  ["Cutting and preparation department", "Bộ phận cắt và chuẩn bị"],
  ["Quality-control inspection station", "Trạm kiểm tra chất lượng"],
  ["Sample room and R&D office", "Phòng mẫu và văn phòng R&D"],
];

export async function seedCompanies(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const userRows: UserRow[] = [];
  const companyRows: CompanyRow[] = [];
  const memberRows: MemberRow[] = [];
  const manufacturerRows: ManufacturerRow[] = [];
  const buyerProfileRows: BuyerProfileRow[] = [];
  const industryRows: IndustryRow[] = [];
  const certRows: CertRow[] = [];
  const mediaRows: MediaRow[] = [];
  const badgeRows: BadgeRow[] = [];
  const verificationRows: VerificationRow[] = [];
  const complianceRows: ComplianceRow[] = [];
  const subscriptionRows: SubscriptionRow[] = [];

  const badge = (code: string) => w.ref(w.ctx.badgeIds, code, "badge");
  const plan = (code: string) => w.ref(w.ctx.planIds, code, "plan");
  const partnerBank = w.ref(w.ctx.paymentProviderIds, "PARTNER_BANK_TA", "payment provider");

  // ---------------------------------------------------------------- suppliers
  for (const s of SUPPLIERS) {
    const companyId = rng.id();
    const ownerId = rng.id();
    const createdAt = w.daysAgo(rng.int(240, 720));
    const verified = s.verification === "VERIFIED";
    const verifiedAt = verified ? w.daysAgo(rng.int(45, 400)) : null;
    const certNames = s.certs.map((c) => CERT_NAME.get(c) ?? c);
    const { en, vi } = composeCompanyDescription(s, certNames);
    const provinceId = w.ref(w.ctx.provinceIds, s.province, "province");

    userRows.push({
      id: ownerId,
      email: s.owner.email,
      name: s.owner.name,
      phone: s.owner.phone,
      passwordHash: w.passwordHash,
      locale: "vi",
      timezone: "Asia/Ho_Chi_Minh",
      platformRole: "USER",
      status: "ACTIVE",
      emailVerifiedAt: createdAt,
      phoneVerifiedAt: createdAt,
      lastLoginAt: w.hoursAgo(rng.int(1, 240)),
      createdAt,
      updatedAt: createdAt,
    });
    memberRows.push({ id: rng.id(), companyId, userId: ownerId, role: "OWNER", title: s.owner.title, status: "ACTIVE", isPrimary: true, joinedAt: createdAt, createdAt, updatedAt: createdAt });

    let salesUserId: string | null = null;
    if (s.sales) {
      salesUserId = rng.id();
      const joined = new Date(createdAt.getTime() + rng.int(5, 60) * 86_400_000);
      userRows.push({
        id: salesUserId,
        email: s.sales.email,
        name: s.sales.name,
        passwordHash: w.passwordHash,
        locale: "vi",
        timezone: "Asia/Ho_Chi_Minh",
        status: "ACTIVE",
        emailVerifiedAt: joined,
        lastLoginAt: w.hoursAgo(rng.int(1, 300)),
        createdAt: joined,
        updatedAt: joined,
      });
      memberRows.push({ id: rng.id(), companyId, userId: salesUserId, role: "SALES", title: s.sales.title, status: "ACTIVE", isPrimary: false, invitedById: ownerId, joinedAt: joined, createdAt: joined, updatedAt: joined });
    }

    const plansBoost = { FREE: 0, PRO: 2, PREMIUM: 5 }[s.plan];
    const baseViews = s.plan === "PREMIUM" ? rng.int(2500, 6500) : s.plan === "PRO" ? rng.int(900, 3000) : rng.int(150, 900);
    companyRows.push({
      id: companyId,
      slug: s.slug,
      name: s.name,
      nameVi: s.nameVi,
      legalName: s.legalName,
      businessType: s.businessType,
      isSeller: true,
      isBuyer: false,
      status: "ACTIVE",
      countryCode: "VN",
      provinceId,
      city: s.city,
      address: s.address,
      postalCode: null,
      taxId: s.taxId,
      registrationNumber: `${s.taxId} (Sở KH&ĐT ${s.city === "Ho Chi Minh City" ? "TP.HCM" : s.city === "Hanoi" ? "Hà Nội" : provinceLabel(s.province)})`,
      website: s.website,
      email: s.email,
      phone: s.phone,
      logoUrl: null,
      coverUrl: `https://loremflickr.com/1200/500/factory,${s.coverKeyword}?lock=${SUPPLIERS.indexOf(s) + 301}`,
      tagline: s.tagline,
      taglineVi: s.taglineVi,
      description: en,
      descriptionVi: vi,
      yearEstablished: s.year,
      employeeRange: s.employees,
      annualRevenueUsd: revenueFor(s.employees, rng.float(0.8, 1.3)),
      languages: s.languages,
      verificationStatus: s.verification,
      verifiedAt,
      kybStatus: verified ? "VERIFIED" : "PENDING",
      sanctionsStatus: "CLEAR",
      responseRate: s.responseRate,
      avgResponseHours: s.avgResponseHours,
      ratingAvg: 0,
      ratingCount: 0,
      transactionCount: 0,
      transactionVolumeUsd: 0,
      viewCount: baseViews + (s.featured ? 2000 : 0),
      isFeatured: !!s.featured,
      featuredUntil: s.featured ? w.daysFromNow(90) : null,
      searchBoost: plansBoost,
      seoTitle: `${s.name} — ${s.tagline}`,
      seoDescription: `${s.name} (${s.city}, Vietnam): ${s.tagline}. ${verified ? "Verified manufacturer on CANG. " : ""}Capacity ${s.factory.capacity}, MOQ from US$${s.factory.minOrderUsd.toLocaleString("en-US")}, lead time ${s.factory.leadDays} days.`,
      metadata: { seed: "demo", coverKeyword: s.coverKeyword },
      createdAt,
      updatedAt: w.daysAgo(rng.int(0, 20)),
    });

    const f = s.factory;
    manufacturerRows.push({
      id: rng.id(),
      companyId,
      factoryAddress: f.address,
      factorySizeSqm: f.sizeSqm,
      productionLines: f.lines,
      annualCapacity: f.capacity,
      annualCapacityValue: f.capacityValue,
      annualCapacityUnit: f.capacityUnit,
      oemCapable: f.oem,
      odmCapable: f.odm,
      privateLabelCapable: f.privateLabel,
      minOrderValueUsd: f.minOrderUsd,
      avgLeadTimeDays: f.leadDays,
      sampleLeadTimeDays: f.sampleDays,
      exportCountries: f.exportCountries,
      mainMarkets: f.mainMarkets,
      exportPercentage: f.exportPct,
      exportExperienceYears: f.exportYears,
      rdStaffCount: f.rdStaff,
      qcStaffCount: f.qcStaff,
      mainEquipment: f.equipment,
      mainMaterials: f.materials,
      paymentTermsAccepted: f.paymentTerms,
      acceptedIncoterms: f.incoterms,
      videoUrls: f.tour ? [`https://www.youtube.com/watch?v=${videoIdFor(s.slug)}`] : [],
      factoryTourAvailable: f.tour,
      createdAt,
      updatedAt: createdAt,
    });

    s.industries.forEach((slug, i) => industryRows.push({ companyId, industryId: w.industry(slug), isPrimary: i === 0 }));

    for (const code of s.certs) {
      const issuedAt = w.daysAgo(rng.int(150, 900));
      certRows.push({
        id: rng.id(),
        companyId,
        certificationId: w.certification(code),
        certificateNumber: `${code.replace(/_/g, "")}-VN-${issuedAt.getFullYear()}-${String(rng.int(1000, 9999))}`,
        issuedAt,
        expiresAt: new Date(issuedAt.getTime() + 3 * 365 * 86_400_000),
        status: "VERIFIED",
        createdAt,
        updatedAt: createdAt,
      });
    }

    s.mediaKeywords.forEach((kw, i) => {
      const [caption] = MEDIA_CAPTIONS[i % MEDIA_CAPTIONS.length];
      mediaRows.push({ id: rng.id(), companyId, kind: "PHOTO", url: w.image(1200, 800, kw), thumbnailUrl: null, caption, sortOrder: i, createdAt });
    });
    if (s.factory.tour && s.mediaKeywords.length < 6) {
      mediaRows.push({ id: rng.id(), companyId, kind: "VIDEO", url: `https://www.youtube.com/watch?v=${videoIdFor(s.slug)}`, thumbnailUrl: w.image(1200, 800, `${s.coverKeyword},video`), caption: "Factory tour", sortOrder: s.mediaKeywords.length, createdAt });
    }

    // badges per rule (TOP_SUPPLIER is granted in the reviews step once ratings exist)
    const grantedAt = verifiedAt ?? createdAt;
    if (verified) badgeRows.push({ id: rng.id(), companyId, badgeId: badge("VERIFIED_MANUFACTURER"), source: "RULE", grantedAt, note: "Business registration, tax code and factory ownership verified." });
    if (s.audited) badgeRows.push({ id: rng.id(), companyId, badgeId: badge("FACTORY_AUDITED"), source: "RULE", grantedAt: w.daysAgo(rng.int(30, 300)), expiresAt: w.daysFromNow(rng.int(200, 600)), note: "On-site factory audit completed." });
    if (f.exportCountries.length >= 3 && f.incoterms.length > 0) badgeRows.push({ id: rng.id(), companyId, badgeId: badge("EXPORT_READY"), source: "RULE", grantedAt: createdAt, note: `${f.exportCountries.length} export countries documented.` });
    if (s.responseRate >= 90 && s.avgResponseHours <= 24) badgeRows.push({ id: rng.id(), companyId, badgeId: badge("FAST_RESPONSE"), source: "RULE", grantedAt: w.daysAgo(rng.int(5, 80)), note: `Response rate ${s.responseRate}%, average ${s.avgResponseHours}h (rolling 90 days).` });

    // verifications
    if (verified && verifiedAt) {
      verificationRows.push({
        id: rng.id(),
        companyId,
        type: "KYB",
        status: "VERIFIED",
        data: { legalName: s.legalName, taxId: s.taxId, registrationNumber: s.taxId, legalRepresentative: s.owner.name, documents: ["business_registration.pdf", "tax_certificate.pdf", "factory_lease_or_title.pdf"] },
        notes: "Registration matched the National Business Registration Portal; tax code active; factory address confirmed by video call.",
        submittedAt: new Date(verifiedAt.getTime() - rng.int(2, 6) * 86_400_000),
        reviewedAt: verifiedAt,
        reviewedById: w.adminUserId,
        expiresAt: new Date(verifiedAt.getTime() + 2 * 365 * 86_400_000),
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
      });
    } else {
      const submittedAt = w.daysAgo(rng.int(2, 25));
      verificationRows.push({
        id: rng.id(),
        companyId,
        type: "KYB",
        status: "PENDING",
        data: { legalName: s.legalName, taxId: s.taxId, legalRepresentative: s.owner.name, documents: ["business_registration.pdf", "tax_certificate.pdf"] },
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      });
    }
    if (s.audited) {
      const auditedAt = w.daysAgo(rng.int(30, 300));
      verificationRows.push({
        id: rng.id(),
        companyId,
        type: "FACTORY_AUDIT",
        status: "VERIFIED",
        data: { auditor: rng.pick(["Asia Audit Partners", "Vietnam Quality Control Services", "CANG field team"]), score: rng.int(82, 97), scope: "Capability, capacity, quality system, social compliance walkthrough", linesObserved: f.lines, workersOnSite: f.qcStaff * rng.int(8, 14) },
        notes: "Audit report on file; capacity and equipment consistent with the profile.",
        submittedAt: new Date(auditedAt.getTime() - 14 * 86_400_000),
        reviewedAt: auditedAt,
        reviewedById: w.adminUserId,
        expiresAt: new Date(auditedAt.getTime() + 2 * 365 * 86_400_000),
        createdAt: auditedAt,
        updatedAt: auditedAt,
      });
    }

    complianceRows.push(complianceRow(w, companyId, createdAt));
    subscriptionRows.push(subscriptionRow(w, companyId, plan(s.plan), s.plan, createdAt, partnerBank));

    w.suppliers.set(s.slug, { id: companyId, slug: s.slug, name: s.name, ownerUserId: ownerId, salesUserId, seed: s, verified, audited: !!s.audited });
  }

  // ---------------------------------------------------------------- buyers
  for (const b of BUYERS) {
    const companyId = rng.id();
    const ownerId = rng.id();
    const createdAt = w.daysAgo(rng.int(120, 500));
    const verifiedAt = b.verified ? w.daysAgo(rng.int(30, 200)) : null;
    userRows.push({
      id: ownerId,
      email: b.owner.email,
      name: b.owner.name,
      phone: b.owner.phone,
      passwordHash: w.passwordHash,
      locale: b.owner.locale,
      timezone: b.timezone,
      status: "ACTIVE",
      emailVerifiedAt: createdAt,
      lastLoginAt: w.hoursAgo(rng.int(1, 72)),
      createdAt,
      updatedAt: createdAt,
    });
    memberRows.push({ id: rng.id(), companyId, userId: ownerId, role: "OWNER", title: b.owner.title, status: "ACTIVE", isPrimary: true, joinedAt: createdAt, createdAt, updatedAt: createdAt });
    companyRows.push({
      id: companyId,
      slug: b.slug,
      name: b.name,
      nameVi: b.nameVi ?? null,
      legalName: b.legalName,
      businessType: b.businessType,
      isSeller: !!b.alsoSeller,
      isBuyer: true,
      status: "ACTIVE",
      countryCode: b.countryCode,
      provinceId: b.province ? w.ref(w.ctx.provinceIds, b.province, "province") : null,
      city: b.city,
      address: b.address,
      postalCode: b.postalCode,
      taxId: b.taxId,
      registrationNumber: b.registrationNumber,
      website: b.website,
      email: b.email,
      phone: b.phone,
      coverUrl: w.image(1200, 500, "office,business,warehouse"),
      tagline: b.tagline,
      taglineVi: b.taglineVi,
      description: b.description,
      descriptionVi: b.descriptionVi,
      yearEstablished: b.year,
      employeeRange: b.employees,
      annualRevenueUsd: Math.round(b.profile.annualVolumeUsd * rng.float(4, 9)),
      languages: b.languages,
      verificationStatus: b.verified ? "VERIFIED" : "PENDING",
      verifiedAt,
      kybStatus: b.verified ? "VERIFIED" : "PENDING",
      sanctionsStatus: "CLEAR",
      responseRate: rng.int(80, 98),
      avgResponseHours: rng.int(4, 30),
      viewCount: rng.int(20, 200),
      seoTitle: `${b.name} — buyer on CANG`,
      seoDescription: b.tagline,
      metadata: { seed: "demo" },
      createdAt,
      updatedAt: w.daysAgo(rng.int(0, 15)),
    });
    buyerProfileRows.push({
      id: rng.id(),
      companyId,
      sourcingCategories: b.profile.categories,
      annualPurchasingVolumeUsd: b.profile.annualVolumeUsd,
      preferredCurrency: b.profile.currency,
      destinationCountries: b.profile.destinations,
      preferredIncoterms: b.profile.incoterms,
      companySizeNote: b.profile.note,
      createdAt,
      updatedAt: createdAt,
    });
    if (b.alsoSeller) {
      manufacturerRows.push({
        id: rng.id(),
        companyId,
        factoryAddress: "Lô C3, Cụm công nghiệp Ninh Hiệp, Huyện Gia Lâm, Hà Nội (kho phân phối)",
        factorySizeSqm: 3000,
        productionLines: 0,
        annualCapacity: "3,000 m² distribution warehouse, 400 industrial customers",
        oemCapable: false,
        odmCapable: false,
        privateLabelCapable: false,
        minOrderValueUsd: 500,
        avgLeadTimeDays: 3,
        sampleLeadTimeDays: 2,
        exportCountries: ["LA", "KH", "AE"],
        mainMarkets: ["Vietnam", "Laos", "Cambodia"],
        exportPercentage: 15,
        exportExperienceYears: 4,
        rdStaffCount: 0,
        qcStaffCount: 4,
        mainEquipment: "Racked warehouse with 2 forklifts, cable-cutting station, labelling line",
        mainMaterials: "Stocked LED lighting, cables, hand tools, PPE and packaging consumables from Vietnamese manufacturers",
        paymentTermsAccepted: ["T/T", "Bank transfer (VND)"],
        acceptedIncoterms: ["EXW", "FCA", "FOB", "DAP"],
        videoUrls: [],
        factoryTourAvailable: false,
        createdAt,
        updatedAt: createdAt,
      });
      industryRows.push({ companyId, industryId: w.industry("industrial-services"), isPrimary: true });
      industryRows.push({ companyId, industryId: w.industry("electrical-equipment"), isPrimary: false });
      if (b.profile.destinations.length >= 3) badgeRows.push({ id: rng.id(), companyId, badgeId: badge("EXPORT_READY"), source: "RULE", grantedAt: createdAt, note: "3 export countries documented." });
    }
    if (b.verified && verifiedAt) {
      verificationRows.push({
        id: rng.id(),
        companyId,
        type: "KYB",
        status: "VERIFIED",
        data: { legalName: b.legalName, registrationNumber: b.registrationNumber, taxId: b.taxId, legalRepresentative: b.owner.name, documents: ["company_extract.pdf", "vat_certificate.pdf"] },
        notes: "Registry extract matched; VAT number validated.",
        submittedAt: new Date(verifiedAt.getTime() - 3 * 86_400_000),
        reviewedAt: verifiedAt,
        reviewedById: w.adminUserId,
        expiresAt: new Date(verifiedAt.getTime() + 2 * 365 * 86_400_000),
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
      });
    } else {
      const submittedAt = w.daysAgo(rng.int(2, 15));
      verificationRows.push({ id: rng.id(), companyId, type: "KYB", status: "PENDING", data: { legalName: b.legalName, registrationNumber: b.registrationNumber, taxId: b.taxId, documents: ["company_extract.pdf"] }, submittedAt, createdAt: submittedAt, updatedAt: submittedAt });
    }
    complianceRows.push(complianceRow(w, companyId, createdAt));
    subscriptionRows.push(subscriptionRow(w, companyId, plan("FREE"), "FREE", createdAt, partnerBank));
    w.buyers.set(b.slug, { id: companyId, slug: b.slug, name: b.name, ownerUserId: ownerId, seed: b });
  }

  await insertAll(db, users, userRows);
  await insertAll(db, companies, companyRows);
  await insertAll(db, companyMembers, memberRows);
  await insertAll(db, manufacturerProfiles, manufacturerRows);
  await insertAll(db, buyerProfiles, buyerProfileRows);
  await insertAll(db, companyIndustries, industryRows);
  await insertAll(db, companyCertifications, certRows);
  await insertAll(db, companyMedia, mediaRows);
  await insertAll(db, companyBadges, badgeRows);
  await insertAll(db, verifications, verificationRows);
  await insertAll(db, complianceChecks, complianceRows);
  await insertAll(db, subscriptions, subscriptionRows);
  console.log(`  companies: ${companyRows.length} (${SUPPLIERS.length} suppliers, ${BUYERS.length} buyers), users: ${userRows.length}`);
}

function complianceRow(w: World, companyId: string, createdAt: Date): ComplianceRow {
  const checkedAt = new Date(createdAt.getTime() + 86_400_000);
  return {
    id: w.rng.id(),
    companyId,
    type: "SANCTIONS",
    provider: "manual",
    status: "CLEARED",
    result: { lists: ["OFAC SDN", "EU consolidated", "UN Security Council", "UK HMT"], matches: 0, screenedNames: 2 },
    riskScore: w.rng.int(2, 14),
    notes: "No matches on sanctions lists; PEP screening negative.",
    checkedAt,
    reviewedById: w.adminUserId,
    nextReviewAt: new Date(checkedAt.getTime() + 365 * 86_400_000),
    createdAt: checkedAt,
    updatedAt: checkedAt,
  };
}

function subscriptionRow(w: World, companyId: string, planId: string, planCode: string, createdAt: Date, providerId: string): SubscriptionRow {
  const yearly = planCode !== "FREE" && w.rng.chance(0.6);
  const periodStart = planCode === "FREE" ? createdAt : w.daysAgo(w.rng.int(5, yearly ? 300 : 28));
  const periodEnd = new Date(periodStart.getTime() + (yearly || planCode === "FREE" ? 365 : 30) * 86_400_000);
  return {
    id: w.rng.id(),
    companyId,
    planId,
    status: "ACTIVE",
    billingCycle: yearly ? "yearly" : "monthly",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    paymentProviderId: planCode === "FREE" ? null : providerId,
    externalId: planCode === "FREE" ? null : `SUB-${w.rng.int(100000, 999999)}`,
    createdAt,
    updatedAt: periodStart,
  };
}

function revenueFor(range: string, factor: number): number {
  const base: Record<string, number> = { R_1_10: 300_000, R_11_50: 1_200_000, R_51_200: 4_500_000, R_201_500: 12_000_000, R_501_1000: 28_000_000, R_1001_5000: 65_000_000, R_5000_PLUS: 150_000_000 };
  return Math.round(((base[range] ?? 5_000_000) * factor) / 10_000) * 10_000;
}

function provinceLabel(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function videoIdFor(slug: string): string {
  // deterministic pseudo YouTube id derived from the slug (demo links only)
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 11; i++) {
    out += alphabet[h % alphabet.length];
    h = (h * 1103515245 + 12345) >>> 0;
  }
  return out;
}
