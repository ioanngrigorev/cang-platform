import { BadgeCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompanyForm } from "@/components/buyer/company-form";
import { Button, Card, CardContent, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll, ensureBuyerProfile, getBuyerCompanyProfile, topCategories } from "@/modules/company-profile/buyer-queries";

export const metadata: Metadata = { title: "Company profile", robots: { index: false } };

export default async function BuyerCompanyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "company.profile.read", buyer: true });
  const t = await getTranslations("buyer.company");

  await ensureBuyerProfile(company.id);
  const [profile, countries, categories] = await Promise.all([getBuyerCompanyProfile(company.id), countryOptionsAll(), topCategories()]);
  const bp = profile?.buyerProfile ?? null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button href="/buyer/company/verification" variant="secondary">
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
          <Button href="/buyer/company/verification" variant="ghost" size="sm" className="ml-auto">
            {t("manageVerification")} <ExternalLink />
          </Button>
        </CardContent>
      </Card>

      <CompanyForm
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        categories={categories.map((c) => ({ id: c.id, slug: c.slug, label: localized(c, "name", locale) }))}
        defaults={{
          name: company.name,
          legalName: company.legalName,
          businessType: company.businessType,
          countryCode: company.countryCode,
          city: company.city,
          address: company.address,
          postalCode: company.postalCode,
          website: company.website,
          email: company.email,
          phone: company.phone,
          taxId: company.taxId,
          registrationNumber: company.registrationNumber,
          yearEstablished: company.yearEstablished,
          employeeRange: company.employeeRange,
          tagline: company.tagline,
          description: company.description,
          logoUrl: company.logoUrl,
          sourcingCategories: bp?.sourcingCategories ?? [],
          destinationCountries: bp?.destinationCountries ?? [],
          preferredIncoterms: bp?.preferredIncoterms ?? [],
          preferredCurrency: bp?.preferredCurrency ?? "USD",
          annualPurchasingVolumeUsd: bp?.annualPurchasingVolumeUsd ?? null,
          companySizeNote: bp?.companySizeNote ?? null,
        }}
      />
    </>
  );
}
