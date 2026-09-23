import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FactoryForm } from "@/components/seller/factory-form";
import { PageHeader } from "@/components/ui";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { ensureManufacturerProfile, listFactoryMedia } from "@/modules/seller/company/queries";

export const metadata: Metadata = { title: "Factory profile", robots: { index: false } };

export default async function FactoryProfilePage() {
  const { company } = await requireCompany({ permission: "company.profile.read", seller: true });
  const auth = await getAuth();
  const t = await getTranslations("seller.factory");
  const [mp, media] = await Promise.all([ensureManufacturerProfile(company.id), listFactoryMedia(company.id)]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("companyCrumb"), href: "/seller/company" },
          { label: t("title") },
        ]}
      />
      <FactoryForm
        canWrite={canCompany(auth, "company.profile.write")}
        media={media.map((m) => ({ id: m.id, kind: m.kind, url: m.url, caption: m.caption }))}
        defaults={{
          factoryAddress: mp?.factoryAddress ?? null,
          factorySizeSqm: mp?.factorySizeSqm ?? null,
          productionLines: mp?.productionLines ?? null,
          annualCapacity: mp?.annualCapacity ?? null,
          annualCapacityValue: mp?.annualCapacityValue ?? null,
          annualCapacityUnit: mp?.annualCapacityUnit ?? null,
          rdStaffCount: mp?.rdStaffCount ?? null,
          qcStaffCount: mp?.qcStaffCount ?? null,
          mainEquipment: mp?.mainEquipment ?? null,
          mainMaterials: mp?.mainMaterials ?? null,
          videoUrls: mp?.videoUrls ?? [],
        }}
      />
    </>
  );
}
