import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { Alert, PageHeader } from "@/components/ui";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";
import { getAllSettings } from "@/modules/settings/service";

export const metadata: Metadata = { title: "System settings", robots: { index: false } };

export default async function AdminSettingsPage() {
  const auth = await requireAdmin("admin.access");
  const t = await getTranslations("admin.settings");
  const settings = await getAllSettings();
  const canWrite = canPlatform(auth, "admin.settings.write");
  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description")} />
      {!canWrite ? (
        <Alert variant="warning" className="mb-6">
          {t("readOnly")}
        </Alert>
      ) : null}
      <SettingsForm settings={settings.map((s) => ({ key: s.key, group: s.group, value: s.value, default: s.default, description: s.description, isOverridden: s.isOverridden }))} canWrite={canWrite} />
    </div>
  );
}
