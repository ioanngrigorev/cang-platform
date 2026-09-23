import { Award, BadgeCheck, ExternalLink, Factory } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SellerCompanyForm } from "@/components/seller/company-form";
import { Button, Card, CardContent, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll } from "@/modules/company-profile/buyer-queries";
import { ensureManufacturerProfile, getSellerCompanyProfile, industryOptions, provinceOptions } from "@/modules/seller/company/queries";

export const metadata: Metadata = { title: "Company profile", robots: { index: false } };

export default async function SellerCompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "company.profile.read", seller: true });
  const t = await getTranslations("seller.company");

  await ensureManufacturerProfile(company.id);
  const [profile, countries, provinces, industries] = await Promise.all([getSellerCompanyProfile(company.id), countryOptionsAll(), provinceOptions("VN"), industryOptions()]);
  const mp = profile?.manufacturerProfile ?? null;
  const industryIds = profile?.industries.map((i) => i.industryId) ?? [];
  const primaryIndustryId = profile?.industries.find((i) => i.isPrimary)?.industryId ?? null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button href={`/supplier/${company.slug}`} variant="secondary" target="_blank">
              <ExternalLink /> {t("publicProfile")}
            </Button>
            <Button href="/seller/company/verification" variant="secondary">
              <BadgeCheck /> {t("manageVerification")}
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader title={t("verificationCard")} />
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("verificationStatus")}</p>
            <StatusBadge status={company.verificationStatus} className="mt-1" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("kybStatus")}</p>
            <StatusBadge status={company.kybStatus} className="mt-1" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("accountStatus")}</p>
            <StatusBadge status={company.status} className="mt-1" />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button href="/seller/company/factory" variant="ghost" size="sm">
              <Factory /> {t("factoryLink")}
            </Button>
            <Button href="/seller/company/certifications" variant="ghost" size="sm">
              <Award /> {t("certificationsLink")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SellerCompanyForm
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        provinces={provinces.map((p) => ({ id: p.id, name: locale === "vi" ? p.nameVi : p.name, region: p.region }))}
        industries={industries.map((i) => ({ id: i.id, name: locale === "vi" ? i.nameVi : i.name }))}
        defaults={{
          name: company.name,
          nameVi: company.nameVi,
          legalName: company.legalName,
          businessType: company.businessType,
          employeeRange: company.employeeRange,
          yearEstablished: company.yearEstablished,
          tagline: company.tagline,
          taglineVi: company.taglineVi,
          description: company.description,
          descriptionVi: company.descriptionVi,
          website: company.website,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          postalCode: company.postalCode,
          provinceId: company.provinceId,
          countryCode: company.countryCode,
          taxId: company.taxId,
          registrationNumber: company.registrationNumber,
          languages: company.languages,
          industryIds,
          primaryIndustryId,
          logoUrl: company.logoUrl,
          coverUrl: company.coverUrl,
          oemCapable: mp?.oemCapable ?? false,
          odmCapable: mp?.odmCapable ?? false,
          privateLabelCapable: mp?.privateLabelCapable ?? false,
          minOrderValueUsd: mp?.minOrderValueUsd ?? null,
          avgLeadTimeDays: mp?.avgLeadTimeDays ?? null,
          sampleLeadTimeDays: mp?.sampleLeadTimeDays ?? null,
          exportCountries: mp?.exportCountries ?? [],
          mainMarkets: mp?.mainMarkets ?? [],
          exportPercentage: mp?.exportPercentage ?? null,
          exportExperienceYears: mp?.exportExperienceYears ?? null,
          paymentTermsAccepted: mp?.paymentTermsAccepted ?? [],
          acceptedIncoterms: mp?.acceptedIncoterms ?? [],
          factoryTourAvailable: mp?.factoryTourAvailable ?? false,
        }}
      />
    </>
  );
}
