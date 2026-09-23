"use client";

import { Archive, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveBannerAction, saveCmsPageAction, saveEmailTemplateAction, saveHomepageSectionAction, setCmsPageStatusAction, toggleBannerAction, toggleHomepageSectionAction } from "@/modules/admin/cms/actions";
import { BANNER_PLACEMENTS, LOCALES, PAGE_STATUSES, PAGE_TYPES } from "@/modules/admin/cms/schemas";

function useEditTrigger({ editing, newLabel }: { editing: boolean; newLabel: string }) {
  const tc = useTranslations("admin.common");
  return (open: () => void) =>
    editing ? (
      <Button variant="ghost" size="xs" onClick={open}>
        <Pencil /> {tc("edit")}
      </Button>
    ) : (
      <Button variant="primary" size="sm" onClick={open}>
        <Plus /> {newLabel}
      </Button>
    );
}

export type CmsPageValues = { id?: string; slug?: string; locale?: string; type?: string; title?: string; excerpt?: string | null; content?: string; status?: string; coverImageUrl?: string | null; seoTitle?: string | null; seoDescription?: string | null; sortOrder?: number };

export function CmsPageDialog({ values }: { values?: CmsPageValues }) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useEditTrigger({ editing, newLabel: t("newPage") });
  return (
    <DialogForm action={saveCmsPageAction} hidden={{ pageId: values?.id }} title={editing ? t("editPage") : t("newPage")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="xl" trigger={trigger}>
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={t("slug")} htmlFor="slug" error={fieldError("slug")} required className="sm:col-span-2">
              <Input id="slug" name="slug" defaultValue={values?.slug ?? ""} required />
            </Field>
            <Field label={t("locale")} htmlFor="locale" error={fieldError("locale")} required>
              <Select id="locale" name="locale" defaultValue={values?.locale ?? "en"}>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("type")} htmlFor="type" error={fieldError("type")} required>
              <Select id="type" name="type" defaultValue={values?.type ?? "PAGE"}>
                {PAGE_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("pageTitle")} htmlFor="title" error={fieldError("title")} required className="sm:col-span-3">
              <Input id="title" name="title" defaultValue={values?.title ?? ""} required />
            </Field>
            <Field label={tc("status")} htmlFor="status" error={fieldError("status")} required>
              <Select id="status" name="status" defaultValue={values?.status ?? "DRAFT"}>
                {PAGE_STATUSES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("excerpt")} htmlFor="excerpt" error={fieldError("excerpt")}>
            <Input id="excerpt" name="excerpt" defaultValue={values?.excerpt ?? ""} />
          </Field>
          <Field label={t("content")} htmlFor="content" error={fieldError("content")} hint={t("contentHint")} required>
            <Textarea id="content" name="content" rows={18} className="font-mono text-xs" defaultValue={values?.content ?? ""} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("seoTitle")} htmlFor="seoTitle" error={fieldError("seoTitle")}>
              <Input id="seoTitle" name="seoTitle" defaultValue={values?.seoTitle ?? ""} />
            </Field>
            <Field label={t("seoDescription")} htmlFor="seoDescription" error={fieldError("seoDescription")}>
              <Input id="seoDescription" name="seoDescription" defaultValue={values?.seoDescription ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label={t("coverImage")} htmlFor="coverImageUrl" error={fieldError("coverImageUrl")}>
            <Input id="coverImageUrl" name="coverImageUrl" defaultValue={values?.coverImageUrl ?? ""} />
          </Field>
        </>
      )}
    </DialogForm>
  );
}

export function CmsPageStatusButtons({ pageId, status }: { pageId: string; status: string }) {
  const t = useTranslations("admin.cms");
  return (
    <span className="inline-flex gap-1">
      {status !== "PUBLISHED" ? <ActionForm action={setCmsPageStatusAction} hidden={{ pageId, status: "PUBLISHED" }} label={t("publish")} icon={<Eye />} variant="primary" size="xs" /> : null}
      {status === "PUBLISHED" ? <ActionForm action={setCmsPageStatusAction} hidden={{ pageId, status: "DRAFT" }} label={t("unpublish")} icon={<EyeOff />} variant="ghost" size="xs" /> : null}
      {status !== "ARCHIVED" ? <ActionForm action={setCmsPageStatusAction} hidden={{ pageId, status: "ARCHIVED" }} label={t("archive")} icon={<Archive />} variant="ghost" size="xs" /> : null}
    </span>
  );
}

export type BannerValues = { id?: string; placement?: string; locale?: string | null; title?: string; subtitle?: string | null; imageUrl?: string | null; ctaLabel?: string | null; ctaUrl?: string | null; sortOrder?: number; isActive?: boolean; startAt?: string | null; endAt?: string | null };

export function BannerDialog({ values }: { values?: BannerValues }) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useEditTrigger({ editing, newLabel: t("newBanner") });
  return (
    <DialogForm action={saveBannerAction} hidden={{ bannerId: values?.id }} title={editing ? t("editBanner") : t("newBanner")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="lg" trigger={trigger}>
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("placement")} htmlFor="placement" error={fieldError("placement")} required>
              <Select id="placement" name="placement" defaultValue={values?.placement ?? "HOMEPAGE_HERO"}>
                {BANNER_PLACEMENTS.map((x) => (
                  <option key={x} value={x}>
                    {x.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("locale")} htmlFor="locale" error={fieldError("locale")}>
              <Select id="locale" name="locale" defaultValue={values?.locale ?? ""}>
                <option value="">{t("allLocales")}</option>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("bannerTitle")} htmlFor="title" error={fieldError("title")} required className="sm:col-span-2">
              <Input id="title" name="title" defaultValue={values?.title ?? ""} required />
            </Field>
            <Field label={t("subtitle")} htmlFor="subtitle" error={fieldError("subtitle")} className="sm:col-span-2">
              <Input id="subtitle" name="subtitle" defaultValue={values?.subtitle ?? ""} />
            </Field>
            <Field label={t("ctaLabel")} htmlFor="ctaLabel" error={fieldError("ctaLabel")}>
              <Input id="ctaLabel" name="ctaLabel" defaultValue={values?.ctaLabel ?? ""} />
            </Field>
            <Field label={t("ctaUrl")} htmlFor="ctaUrl" error={fieldError("ctaUrl")}>
              <Input id="ctaUrl" name="ctaUrl" defaultValue={values?.ctaUrl ?? ""} />
            </Field>
            <Field label={t("startAt")} htmlFor="startAt" error={fieldError("startAt")}>
              <Input id="startAt" name="startAt" type="date" defaultValue={values?.startAt ?? ""} />
            </Field>
            <Field label={t("endAt")} htmlFor="endAt" error={fieldError("endAt")}>
              <Input id="endAt" name="endAt" type="date" defaultValue={values?.endAt ?? ""} />
            </Field>
            <Field label={t("imageUrl")} htmlFor="imageUrl" error={fieldError("imageUrl")} hint={t("imageUrlHint")}>
              <Input id="imageUrl" name="imageUrl" defaultValue={values?.imageUrl ?? ""} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
          </div>
          <FileUpload name="imageDocumentId" scope="cms" visibility="PUBLIC" multiple={false} accept="image/*" label={t("uploadImage")} hint={t("uploadImageHint")} />
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function BannerToggle({ bannerId, isActive }: { bannerId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleBannerAction} hidden={{ bannerId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}

export type SectionValues = { id?: string; key?: string; title?: string; titleVi?: string; subtitle?: string | null; subtitleVi?: string | null; config?: unknown; sortOrder?: number; isActive?: boolean };

export function HomepageSectionDialog({ values }: { values?: SectionValues }) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useEditTrigger({ editing, newLabel: t("newSection") });
  return (
    <DialogForm action={saveHomepageSectionAction} hidden={{ sectionId: values?.id }} title={editing ? t("editSection") : t("newSection")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="lg" trigger={trigger}>
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("sectionKey")} htmlFor="key" error={fieldError("key")} required>
              <Input id="key" name="key" defaultValue={values?.key ?? ""} required />
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
            <Field label={t("sectionTitle")} htmlFor="title" error={fieldError("title")} required>
              <Input id="title" name="title" defaultValue={values?.title ?? ""} required />
            </Field>
            <Field label={t("sectionTitleVi")} htmlFor="titleVi" error={fieldError("titleVi")} required>
              <Input id="titleVi" name="titleVi" defaultValue={values?.titleVi ?? ""} required />
            </Field>
            <Field label={t("subtitle")} htmlFor="subtitle" error={fieldError("subtitle")}>
              <Input id="subtitle" name="subtitle" defaultValue={values?.subtitle ?? ""} />
            </Field>
            <Field label={t("subtitleVi")} htmlFor="subtitleVi" error={fieldError("subtitleVi")}>
              <Input id="subtitleVi" name="subtitleVi" defaultValue={values?.subtitleVi ?? ""} />
            </Field>
          </div>
          <Field label={t("config")} htmlFor="config" error={fieldError("config")} hint={t("configHint")}>
            <Textarea id="config" name="config" rows={4} className="font-mono text-xs" defaultValue={values?.config ? JSON.stringify(values.config, null, 2) : "{}"} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}

export function SectionToggle({ sectionId, isActive }: { sectionId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleHomepageSectionAction} hidden={{ sectionId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}

export type EmailTemplateValues = { id?: string; code?: string; locale?: string; subject?: string; bodyHtml?: string; bodyText?: string | null; variables?: string[]; isActive?: boolean };

export function EmailTemplateDialog({ values }: { values?: EmailTemplateValues }) {
  const t = useTranslations("admin.cms");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  const trigger = useEditTrigger({ editing, newLabel: t("newTemplate") });
  return (
    <DialogForm action={saveEmailTemplateAction} hidden={{ templateId: values?.id }} title={editing ? t("editTemplate") : t("newTemplate")} submitLabel={editing ? tc("save") : tc("create")} cancelLabel={tc("cancel")} size="xl" trigger={trigger}>
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("templateCode")} htmlFor="code" error={fieldError("code")} required>
              <Input id="code" name="code" defaultValue={values?.code ?? ""} required />
            </Field>
            <Field label={t("locale")} htmlFor="locale" error={fieldError("locale")} required>
              <Select id="locale" name="locale" defaultValue={values?.locale ?? "en"}>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("variables")} htmlFor="variables" error={fieldError("variables")} hint={t("variablesHint")}>
              <Input id="variables" name="variables" defaultValue={values?.variables?.join(", ") ?? ""} />
            </Field>
          </div>
          <Field label={t("subject")} htmlFor="subject" error={fieldError("subject")} required>
            <Input id="subject" name="subject" defaultValue={values?.subject ?? ""} required />
          </Field>
          <Field label={t("bodyHtml")} htmlFor="bodyHtml" error={fieldError("bodyHtml")} required>
            <Textarea id="bodyHtml" name="bodyHtml" rows={14} className="font-mono text-xs" defaultValue={values?.bodyHtml ?? ""} required />
          </Field>
          <Field label={t("bodyText")} htmlFor="bodyText" error={fieldError("bodyText")}>
            <Textarea id="bodyText" name="bodyText" rows={4} defaultValue={values?.bodyText ?? ""} />
          </Field>
          <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
        </>
      )}
    </DialogForm>
  );
}
