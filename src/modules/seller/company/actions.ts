"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies, companyCertifications, companyIndustries, companyMedia, documents, manufacturerProfiles } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { ownedCompanyCertification, ownedMedia } from "./queries";
import { certificationIdSchema, companyCertificationSchema, factoryProfileSchema, mediaIdSchema, sellerCompanySchema } from "./schemas";

function revalidate(companySlug?: string) {
  revalidatePath("/[locale]/seller/company", "page");
  revalidatePath("/[locale]/seller/company/factory", "page");
  revalidatePath("/[locale]/seller/company/certifications", "page");
  revalidatePath("/[locale]/seller", "page");
  if (companySlug) for (const locale of ["en", "vi"]) revalidatePath(`/${locale}/supplier/${companySlug}`, "page");
}

/** Resolve an uploaded document that belongs to the company; makes it a PUBLIC photo. */
async function publicPhoto(companyId: string, documentId: string | null, label: string) {
  if (!documentId) return undefined;
  const [doc] = await db
    .select({ id: documents.id, url: documents.url })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)))
    .limit(1);
  if (!doc) throw new ActionError(`The uploaded ${label} could not be found.`, "NOT_FOUND");
  await db.update(documents).set({ type: "PHOTO", visibility: "PUBLIC" }).where(eq(documents.id, doc.id));
  return doc.url;
}

/** Public company record + manufacturer capabilities in one submit. */
export async function updateSellerCompanyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", seller: true });
    const parsed = parseInput(sellerCompanySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    const [logoUrl, coverUrl] = await Promise.all([publicPhoto(company.id, d.logoDocumentId, "logo"), publicPhoto(company.id, d.coverDocumentId, "cover image")]);
    const primaryIndustry = d.primaryIndustryId && d.industryIds.includes(d.primaryIndustryId) ? d.primaryIndustryId : (d.industryIds[0] ?? null);

    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          name: d.name,
          nameVi: d.nameVi,
          legalName: d.legalName,
          businessType: d.businessType,
          employeeRange: d.employeeRange,
          yearEstablished: d.yearEstablished,
          tagline: d.tagline,
          taglineVi: d.taglineVi,
          description: d.description,
          descriptionVi: d.descriptionVi,
          website: d.website,
          email: d.email,
          phone: d.phone,
          address: d.address,
          city: d.city,
          postalCode: d.postalCode,
          provinceId: d.countryCode === "VN" ? d.provinceId : null,
          countryCode: d.countryCode,
          taxId: d.taxId,
          registrationNumber: d.registrationNumber,
          languages: d.languages,
          ...(logoUrl ? { logoUrl } : {}),
          ...(coverUrl ? { coverUrl } : {}),
        })
        .where(eq(companies.id, company.id));

      const capabilities = {
        oemCapable: d.oemCapable,
        odmCapable: d.odmCapable,
        privateLabelCapable: d.privateLabelCapable,
        minOrderValueUsd: d.minOrderValueUsd,
        avgLeadTimeDays: d.avgLeadTimeDays,
        sampleLeadTimeDays: d.sampleLeadTimeDays,
        exportCountries: d.exportCountries,
        mainMarkets: d.mainMarkets,
        exportPercentage: d.exportPercentage,
        exportExperienceYears: d.exportExperienceYears,
        paymentTermsAccepted: d.paymentTermsAccepted,
        acceptedIncoterms: d.acceptedIncoterms,
        factoryTourAvailable: d.factoryTourAvailable,
      };
      await tx
        .insert(manufacturerProfiles)
        .values({ companyId: company.id, ...capabilities })
        .onConflictDoUpdate({ target: manufacturerProfiles.companyId, set: capabilities });

      await tx.delete(companyIndustries).where(eq(companyIndustries.companyId, company.id));
      if (d.industryIds.length) {
        await tx
          .insert(companyIndustries)
          .values(d.industryIds.map((industryId) => ({ companyId: company.id, industryId, isPrimary: industryId === primaryIndustry })))
          .onConflictDoNothing();
      }
    });
    await audit({ actorId: user.id, action: "company.profile.update", entityType: "company", entityId: company.id, after: { name: d.name, businessType: d.businessType } });
    revalidate(company.slug);
    return ok(undefined, "Company profile updated.");
  });
}

/** Factory details + new factory photos (documents → company_media rows). */
export async function updateFactoryProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", seller: true });
    const parsed = parseInput(factoryProfileSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    let photos: Array<{ id: string; url: string; name: string }> = [];
    if (d.photoDocumentIds.length) {
      photos = await db
        .select({ id: documents.id, url: documents.url, name: documents.name })
        .from(documents)
        .where(and(inArray(documents.id, d.photoDocumentIds), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)));
      if (photos.length !== d.photoDocumentIds.length) throw new ActionError("One of the uploaded photos could not be found.", "NOT_FOUND");
      const order = new Map(d.photoDocumentIds.map((id, i) => [id, i]));
      photos.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    await db.transaction(async (tx) => {
      const factory = {
        factoryAddress: d.factoryAddress,
        factorySizeSqm: d.factorySizeSqm,
        productionLines: d.productionLines,
        annualCapacity: d.annualCapacity,
        annualCapacityValue: d.annualCapacityValue,
        annualCapacityUnit: d.annualCapacityUnit,
        rdStaffCount: d.rdStaffCount,
        qcStaffCount: d.qcStaffCount,
        mainEquipment: d.mainEquipment,
        mainMaterials: d.mainMaterials,
        videoUrls: d.videoUrls,
      };
      await tx
        .insert(manufacturerProfiles)
        .values({ companyId: company.id, ...factory })
        .onConflictDoUpdate({ target: manufacturerProfiles.companyId, set: factory });

      if (photos.length) {
        await tx
          .update(documents)
          .set({ type: "PHOTO", visibility: "PUBLIC" })
          .where(inArray(documents.id, photos.map((p) => p.id)));
        const existing = await tx.select({ sortOrder: companyMedia.sortOrder }).from(companyMedia).where(eq(companyMedia.companyId, company.id));
        const start = existing.reduce((m, r) => Math.max(m, r.sortOrder + 1), 0);
        await tx.insert(companyMedia).values(photos.map((p, i) => ({ companyId: company.id, kind: "PHOTO", url: p.url, caption: p.name.replace(/\.[a-z0-9]+$/i, ""), sortOrder: start + i })));
      }
      // Keep the video list mirrored in company_media so the public profile shows it.
      await tx.delete(companyMedia).where(and(eq(companyMedia.companyId, company.id), eq(companyMedia.kind, "VIDEO")));
      if (d.videoUrls.length) {
        await tx.insert(companyMedia).values(d.videoUrls.map((url, i) => ({ companyId: company.id, kind: "VIDEO", url, caption: null, sortOrder: 1000 + i })));
      }
    });
    await audit({ actorId: user.id, action: "company.factory.update", entityType: "company", entityId: company.id, after: { photosAdded: photos.length, videos: d.videoUrls.length } });
    revalidate(company.slug);
    return ok(undefined, "Factory profile updated.");
  });
}

export async function removeFactoryMediaAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", seller: true });
    const parsed = parseInput(mediaIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const media = await ownedMedia(company.id, parsed.data.mediaId);
    if (!media) throw new ActionError("Photo not found.", "NOT_FOUND");
    await db.delete(companyMedia).where(eq(companyMedia.id, media.id));
    await audit({ actorId: user.id, action: "company.media.remove", entityType: "company", entityId: company.id, before: { url: media.url, kind: media.kind } });
    revalidate(company.slug);
    return ok(undefined, "Photo removed.");
  });
}

export async function addCompanyCertificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", seller: true });
    const parsed = parseInput(companyCertificationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    if (d.documentId) {
      const [doc] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.id, d.documentId), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)))
        .limit(1);
      if (!doc) throw new ActionError("The uploaded certificate could not be found.", "NOT_FOUND");
      await db.update(documents).set({ type: "CERTIFICATE", visibility: "ADMIN" }).where(eq(documents.id, doc.id));
    }

    const values = { certificateNumber: d.certificateNumber, issuedAt: d.issuedAt, expiresAt: d.expiresAt, documentId: d.documentId, status: "PENDING" as const };
    const [row] = await db
      .insert(companyCertifications)
      .values({ companyId: company.id, certificationId: d.certificationId, ...values })
      .onConflictDoUpdate({ target: [companyCertifications.companyId, companyCertifications.certificationId], set: values })
      .returning();
    await audit({ actorId: user.id, action: "company.certification.add", entityType: "companyCertification", entityId: row.id, after: { certificationId: d.certificationId, certificateNumber: d.certificateNumber } });
    revalidate(company.slug);
    return ok(undefined, "Certification added — it will show as verified once our team has checked the certificate.");
  });
}

export async function removeCompanyCertificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", seller: true });
    const parsed = parseInput(certificationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const row = await ownedCompanyCertification(company.id, parsed.data.companyCertificationId);
    if (!row) throw new ActionError("Certification not found.", "NOT_FOUND");
    await db.delete(companyCertifications).where(eq(companyCertifications.id, row.id));
    await audit({ actorId: user.id, action: "company.certification.remove", entityType: "companyCertification", entityId: row.id, before: { certificationId: row.certificationId, status: row.status } });
    revalidate(company.slug);
    return ok(undefined, "Certification removed.");
  });
}
