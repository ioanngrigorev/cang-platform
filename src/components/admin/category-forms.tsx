"use client";

import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { saveCategoryAction, toggleCategoryAction } from "@/modules/admin/categories/actions";

export type CategoryOption = { id: string; name: string; level: number; path: string; slug: string };
export type CategoryFormValues = {
  id?: string;
  name?: string;
  nameVi?: string;
  slug?: string;
  parentId?: string | null;
  industryId?: string | null;
  description?: string | null;
  descriptionVi?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
};

export function CategoryDialog({
  values,
  parents,
  industries,
  defaultParentId,
  compact,
}: {
  values?: CategoryFormValues;
  parents: CategoryOption[];
  industries: Array<{ id: string; name: string }>;
  defaultParentId?: string | null;
  compact?: boolean;
}) {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("admin.common");
  const editing = !!values?.id;
  // A category cannot be its own ancestor: exclude itself and its subtree from the parent picker.
  const selfPrefix = values?.id ? `${values.slug}/` : null;
  const options = parents.filter((p) => !values?.id || (p.id !== values.id && !(selfPrefix && p.path.includes(selfPrefix))));
  return (
    <DialogForm
      action={saveCategoryAction}
      hidden={{ categoryId: values?.id }}
      title={editing ? t("editCategory") : t("newCategory")}
      submitLabel={editing ? tc("save") : tc("create")}
      cancelLabel={tc("cancel")}
      size="lg"
      trigger={(open) =>
        editing ? (
          <Button variant="ghost" size="xs" onClick={open} aria-label={t("editCategory")}>
            <Pencil /> {compact ? null : tc("edit")}
          </Button>
        ) : (
          <Button variant={compact ? "ghost" : "primary"} size={compact ? "xs" : "md"} onClick={open}>
            <Plus /> {compact ? t("addChild") : t("newCategory")}
          </Button>
        )
      }
    >
      {({ fieldError }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} htmlFor="name" error={fieldError("name")} required>
              <Input id="name" name="name" defaultValue={values?.name ?? ""} required />
            </Field>
            <Field label={t("nameVi")} htmlFor="nameVi" error={fieldError("nameVi")} required>
              <Input id="nameVi" name="nameVi" defaultValue={values?.nameVi ?? ""} required />
            </Field>
            <Field label={t("slug")} htmlFor="slug" error={fieldError("slug")} hint={t("slugHint")}>
              <Input id="slug" name="slug" defaultValue={values?.slug ?? ""} />
            </Field>
            <Field label={t("parent")} htmlFor="parentId" error={fieldError("parentId")}>
              <Select id="parentId" name="parentId" defaultValue={values?.parentId ?? defaultParentId ?? ""}>
                <option value="">{t("noParent")}</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {"— ".repeat(p.level)}
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("industry")} htmlFor="industryId" error={fieldError("industryId")}>
              <Select id="industryId" name="industryId" defaultValue={values?.industryId ?? ""}>
                <option value="">{t("inheritIndustry")}</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("sortOrder")} htmlFor="sortOrder" error={fieldError("sortOrder")}>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={values?.sortOrder ?? 0} />
            </Field>
            <Field label={t("icon")} htmlFor="icon" error={fieldError("icon")} hint={t("iconHint")}>
              <Input id="icon" name="icon" defaultValue={values?.icon ?? ""} />
            </Field>
          </div>
          <Field label={t("fieldDescription")} htmlFor="description" error={fieldError("description")}>
            <Textarea id="description" name="description" rows={2} defaultValue={values?.description ?? ""} />
          </Field>
          <Field label={t("descriptionVi")} htmlFor="descriptionVi" error={fieldError("descriptionVi")}>
            <Textarea id="descriptionVi" name="descriptionVi" rows={2} defaultValue={values?.descriptionVi ?? ""} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox name="isActive" defaultChecked={values?.isActive ?? true} label={tc("active")} />
            <Checkbox name="isFeatured" defaultChecked={values?.isFeatured ?? false} label={t("featuredOnHome")} />
          </div>
        </>
      )}
    </DialogForm>
  );
}

export function CategoryToggle({ categoryId, isActive }: { categoryId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleCategoryAction} hidden={{ categoryId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} icon={isActive ? <EyeOff /> : <Eye />} variant="ghost" size="xs" />;
}
