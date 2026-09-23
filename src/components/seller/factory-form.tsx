"use client";

import { Trash2, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Button, Card, CardContent, CardHeader, Field, FormError, Input, SmartImage, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { removeFactoryMediaAction, updateFactoryProfileAction } from "@/modules/seller/company/actions";
import { preservingSubmit } from "./preserving-submit";

export type FactoryDefaults = {
  factoryAddress: string | null;
  factorySizeSqm: number | null;
  productionLines: number | null;
  annualCapacity: string | null;
  annualCapacityValue: number | null;
  annualCapacityUnit: string | null;
  rdStaffCount: number | null;
  qcStaffCount: number | null;
  mainEquipment: string | null;
  mainMaterials: string | null;
  videoUrls: string[];
};

export type FactoryMediaItem = { id: string; kind: string; url: string; caption: string | null };

export function FactoryForm({ defaults, media, canWrite }: { defaults: FactoryDefaults; media: FactoryMediaItem[]; canWrite: boolean }) {
  const t = useTranslations("seller.factory");
  const router = useRouter();
  const { state, formAction, fieldError, pending } = useActionForm(updateFactoryProfileAction, { onSuccess: () => router.refresh() });
  const photos = media.filter((m) => m.kind === "PHOTO");

  return (
    <div className="space-y-5">
      <form action={formAction} onSubmit={preservingSubmit(formAction)} className="space-y-5">
        <Card>
          <CardHeader title={t("facility")} description={t("facilityHint")} />
          <CardContent className="space-y-4">
            <Field label={t("factoryAddress")} htmlFor="factoryAddress" error={fieldError("factoryAddress")}>
              <Input id="factoryAddress" name="factoryAddress" defaultValue={defaults.factoryAddress ?? ""} maxLength={300} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("factorySizeSqm")} htmlFor="factorySizeSqm" error={fieldError("factorySizeSqm")}>
                <Input id="factorySizeSqm" name="factorySizeSqm" type="number" min={0} defaultValue={defaults.factorySizeSqm ?? ""} />
              </Field>
              <Field label={t("productionLines")} htmlFor="productionLines" error={fieldError("productionLines")}>
                <Input id="productionLines" name="productionLines" type="number" min={0} defaultValue={defaults.productionLines ?? ""} />
              </Field>
              <Field label={t("rdStaffCount")} htmlFor="rdStaffCount" error={fieldError("rdStaffCount")}>
                <Input id="rdStaffCount" name="rdStaffCount" type="number" min={0} defaultValue={defaults.rdStaffCount ?? ""} />
              </Field>
              <Field label={t("qcStaffCount")} htmlFor="qcStaffCount" error={fieldError("qcStaffCount")}>
                <Input id="qcStaffCount" name="qcStaffCount" type="number" min={0} defaultValue={defaults.qcStaffCount ?? ""} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("annualCapacity")} htmlFor="annualCapacity" error={fieldError("annualCapacity")} hint={t("annualCapacityHint")}>
                <Input id="annualCapacity" name="annualCapacity" defaultValue={defaults.annualCapacity ?? ""} placeholder={t("annualCapacityPlaceholder")} maxLength={200} />
              </Field>
              <Field label={t("annualCapacityValue")} htmlFor="annualCapacityValue" error={fieldError("annualCapacityValue")}>
                <Input id="annualCapacityValue" name="annualCapacityValue" inputMode="decimal" defaultValue={defaults.annualCapacityValue ?? ""} />
              </Field>
              <Field label={t("annualCapacityUnit")} htmlFor="annualCapacityUnit" error={fieldError("annualCapacityUnit")}>
                <Input id="annualCapacityUnit" name="annualCapacityUnit" defaultValue={defaults.annualCapacityUnit ?? ""} placeholder="pieces/year" maxLength={60} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("equipment")} />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("mainEquipment")} htmlFor="mainEquipment" error={fieldError("mainEquipment")} hint={t("mainEquipmentHint")}>
              <Textarea id="mainEquipment" name="mainEquipment" rows={5} defaultValue={defaults.mainEquipment ?? ""} />
            </Field>
            <Field label={t("mainMaterials")} htmlFor="mainMaterials" error={fieldError("mainMaterials")} hint={t("mainMaterialsHint")}>
              <Textarea id="mainMaterials" name="mainMaterials" rows={5} defaultValue={defaults.mainMaterials ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("media")} description={t("mediaHint")} />
          <CardContent className="space-y-4">
            <Field label={t("videoUrls")} htmlFor="videoUrls" error={fieldError("videoUrls")} hint={t("videoUrlsHint")}>
              <Textarea id="videoUrls" name="videoUrls" rows={3} defaultValue={defaults.videoUrls.join("\n")} placeholder="https://www.youtube.com/watch?v=…" />
            </Field>
            <FileUpload name="photoDocumentIds" scope="company" visibility="PUBLIC" accept="image/*" multiple max={12} label={t("addPhotos")} hint={t("addPhotosHint")} />
          </CardContent>
        </Card>

        <FormError state={state} />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            {t("save")}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader title={t("photos")} description={t("photosHint", { count: photos.length })} />
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-steel-500">{t("noPhotos")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-md border border-steel-200 bg-steel-50">
                  <div className="relative aspect-[4/3]">
                    <SmartImage src={m.url} alt={m.caption ?? t("photoAlt")} fill fallbackLabel={m.caption ?? "factory"} />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <p className="min-w-0 truncate text-xs text-steel-600">{m.caption ?? "—"}</p>
                    {canWrite ? <ActionForm action={removeFactoryMediaAction} hidden={{ mediaId: m.id }} label={t("remove")} icon={<Trash2 />} variant="ghost" size="xs" /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {media.some((m) => m.kind === "VIDEO") ? (
            <ul className="mt-4 space-y-1.5">
              {media
                .filter((m) => m.kind === "VIDEO")
                .map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <Video className="size-4 text-steel-400" />
                    <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-ink-900 hover:underline">
                      {m.url}
                    </a>
                  </li>
                ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
