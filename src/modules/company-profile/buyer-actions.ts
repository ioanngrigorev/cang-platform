"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { beneficialOwners, buyerProfiles, companies, documents, users, verifications } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { notifyUser } from "@/modules/notifications/service";
import { buyerCompanySchema, kybSubmissionSchema } from "./buyer-schemas";

function revalidate() {
  revalidatePath("/[locale]/buyer/company", "page");
  revalidatePath("/[locale]/buyer/company/verification", "page");
  revalidatePath("/[locale]/buyer", "page");
  // The KYB form is shared with the supplier dashboard.
  revalidatePath("/[locale]/seller/company", "page");
  revalidatePath("/[locale]/seller/company/verification", "page");
  revalidatePath("/[locale]/seller", "page");
}

/** Update the public company record and the buyer sourcing profile in one submit. */
export async function updateBuyerCompanyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.profile.write", buyer: true });
    const parsed = parseInput(buyerCompanySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    let logoUrl: string | undefined;
    if (d.logoDocumentId) {
      const [doc] = await db
        .select({ url: documents.url })
        .from(documents)
        .where(and(eq(documents.id, d.logoDocumentId), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)))
        .limit(1);
      if (!doc) throw new ActionError("The uploaded logo could not be found.", "NOT_FOUND");
      logoUrl = doc.url;
      await db.update(documents).set({ type: "PHOTO", visibility: "PUBLIC" }).where(eq(documents.id, d.logoDocumentId));
    }

    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          name: d.name,
          legalName: d.legalName,
          businessType: d.businessType,
          countryCode: d.countryCode,
          city: d.city,
          address: d.address,
          postalCode: d.postalCode,
          website: d.website,
          email: d.email,
          phone: d.phone,
          taxId: d.taxId,
          registrationNumber: d.registrationNumber,
          yearEstablished: d.yearEstablished,
          employeeRange: d.employeeRange,
          tagline: d.tagline,
          description: d.description,
          ...(logoUrl ? { logoUrl } : {}),
        })
        .where(eq(companies.id, company.id));
      await tx
        .insert(buyerProfiles)
        .values({
          companyId: company.id,
          sourcingCategories: d.sourcingCategories,
          destinationCountries: d.destinationCountries,
          preferredIncoterms: d.preferredIncoterms,
          preferredCurrency: d.preferredCurrency,
          annualPurchasingVolumeUsd: d.annualPurchasingVolumeUsd,
          companySizeNote: d.companySizeNote,
        })
        .onConflictDoUpdate({
          target: buyerProfiles.companyId,
          set: {
            sourcingCategories: d.sourcingCategories,
            destinationCountries: d.destinationCountries,
            preferredIncoterms: d.preferredIncoterms,
            preferredCurrency: d.preferredCurrency,
            annualPurchasingVolumeUsd: d.annualPurchasingVolumeUsd,
            companySizeNote: d.companySizeNote,
          },
        });
    });
    await audit({ actorId: user.id, action: "company.profile.update", entityType: "company", entityId: company.id, after: { name: d.name } });
    revalidate();
    return ok(undefined, "Company profile updated.");
  });
}

/**
 * Submit the KYB file: documents are re-scoped to ADMIN visibility, beneficial owners are recorded,
 * a KYB verification goes into the review queue and compliance staff are notified.
 */
export async function submitKybAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "company.verification.submit" });
    if (company.kybStatus === "PENDING" || company.kybStatus === "IN_REVIEW") {
      throw new ActionError("Your KYB file is already under review.", "INVALID_STATE");
    }
    const parsed = parseInput(kybSubmissionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const documentIds = [d.businessRegistrationDocumentId, d.taxCertificateDocumentId, d.representativeIdDocumentId];

    const owned = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(inArray(documents.id, documentIds), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)));
    if (owned.length !== 3) throw new ActionError("Upload all three documents before submitting.", "VALIDATION");

    const verification = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(verifications)
        .values({
          companyId: company.id,
          type: "KYB",
          status: "PENDING",
          data: {
            legalName: d.legalName,
            registrationNumber: d.registrationNumber,
            taxId: d.taxId,
            registeredAddress: d.registeredAddress,
            countryCode: d.countryCode,
            representativeName: d.representativeName,
            representativeRole: d.representativeRole,
            owners: d.ownersJson,
            submittedBy: user.id,
          },
        })
        .returning();
      await tx
        .update(documents)
        .set({ verificationId: row.id, visibility: "ADMIN" })
        .where(and(inArray(documents.id, documentIds), eq(documents.ownerCompanyId, company.id)));
      await tx.update(documents).set({ type: "BUSINESS_LICENSE" }).where(eq(documents.id, d.businessRegistrationDocumentId));
      await tx.update(documents).set({ type: "TAX_CERTIFICATE" }).where(eq(documents.id, d.taxCertificateDocumentId));
      await tx.update(documents).set({ type: "ID_DOCUMENT" }).where(eq(documents.id, d.representativeIdDocumentId));

      await tx.delete(beneficialOwners).where(eq(beneficialOwners.companyId, company.id));
      await tx.insert(beneficialOwners).values(
        d.ownersJson.map((o) => ({
          companyId: company.id,
          fullName: o.fullName,
          nationality: o.nationality ?? null,
          ownershipPercent: o.ownershipPercent,
          role: o.role ?? null,
          isPep: o.isPep ?? false,
        })),
      );
      await tx
        .update(companies)
        .set({
          kybStatus: "PENDING",
          legalName: d.legalName,
          registrationNumber: d.registrationNumber,
          taxId: d.taxId,
          address: d.registeredAddress,
          countryCode: d.countryCode,
          ...(company.verificationStatus === "UNVERIFIED" ? { verificationStatus: "PENDING" as const } : {}),
        })
        .where(eq(companies.id, company.id));
      return row;
    });

    const staff = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.platformRole, ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
    await Promise.all(
      staff.map((s) =>
        notifyUser(s.id, {
          type: "VERIFICATION_STATUS",
          title: `KYB submitted: ${company.name}`,
          body: `${d.legalName} · ${d.countryCode} · ${d.ownersJson.length} beneficial owner(s)`,
          link: `/admin/verification`,
          email: false,
        }),
      ),
    );
    await audit({
      actorId: user.id,
      action: "company.kyb.submit",
      entityType: "verification",
      entityId: verification.id,
      after: { companyId: company.id, owners: d.ownersJson.length },
    });
    revalidate();
    return ok(undefined, "KYB file submitted. Our compliance team will review it within 2 business days.");
  });
}
