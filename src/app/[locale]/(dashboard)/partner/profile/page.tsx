import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PartnerProfileForm } from "@/components/partner/partner-forms";
import { Alert, Badge, Card, CardContent, CardHeader, PageHeader } from "@/components/ui";
import { canCompany, getAuth } from "@/modules/auth/current-user";
import { requirePartner } from "@/modules/partner/context";

export const metadata: Metadata = { title: "Partner profile", robots: { index: false } };

export default async function PartnerProfilePage() {
  const { company, provider } = await requirePartner();
  const auth = await getAuth();
  const t = await getTranslations("partner.profile");
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<Badge variant={provider.isActive ? "success" : "warning"}>{provider.isActive ? t("approved") : t("pending")}</Badge>}
      />
      {!provider.isActive ? (
        <Alert variant="warning" title={t("pendingTitle")} className="mb-5">
          {t("pendingBody")}
        </Alert>
      ) : null}
      <Card>
        <CardHeader title={company.name} description={t("code", { code: provider.code })} />
        <CardContent>
          <PartnerProfileForm
            canEdit={canCompany(auth, "company.profile.write")}
            defaults={{ description: provider.description, services: provider.services, modes: provider.modes, countries: provider.countries, phone: company.phone, email: company.email, website: company.website, address: company.address }}
          />
        </CardContent>
      </Card>
    </>
  );
}
