import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PasswordForm, ProfileForm } from "@/components/buyer/settings-forms";
import { PageHeader } from "@/components/ui";
import { requirePartner } from "@/modules/partner/context";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function PartnerSettingsPage() {
  const { user } = await requirePartner();
  const t = await getTranslations("seller.settings");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="space-y-6">
        <ProfileForm defaults={{ name: user.name, email: user.email, phone: user.phone, locale: user.locale, timezone: user.timezone }} />
        <PasswordForm />
      </div>
    </>
  );
}
