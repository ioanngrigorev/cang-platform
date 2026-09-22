import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PasswordForm, ProfileForm } from "@/components/buyer/settings-forms";
import { PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function BuyerSettingsPage() {
  const { user } = await requireCompany({ buyer: true });
  const t = await getTranslations("buyer.settings");

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
