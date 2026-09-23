"use client";

import { Check, EyeOff, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { approveProductAction, featureProductAction, rejectProductAction, unpublishProductAction } from "@/modules/admin/products/actions";

export function ProductAdminActions({ productId, status, isFeatured, searchBoost, canModerate, compact }: { productId: string; status: string; isFeatured: boolean; searchBoost: number; canModerate: boolean; compact?: boolean }) {
  const t = useTranslations("admin.products");
  const tc = useTranslations("admin.common");
  if (!canModerate) return null;
  const size = compact ? "xs" : "sm";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "ACTIVE" ? <ActionForm action={approveProductAction} hidden={{ productId }} label={t("approve")} icon={<Check />} variant="primary" size={size} /> : null}
      {status !== "REJECTED" ? (
        <DialogForm
          action={rejectProductAction}
          hidden={{ productId }}
          title={t("reject")}
          description={t("rejectHint")}
          submitLabel={t("reject")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant={compact ? "ghost" : "danger"} size={size} onClick={open}>
              <X /> {t("reject")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")} required>
              <Textarea id="reason" name="reason" rows={4} required />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {!compact && status === "ACTIVE" ? (
        <DialogForm
          action={unpublishProductAction}
          hidden={{ productId }}
          title={t("unpublish")}
          description={t("unpublishHint")}
          submitLabel={t("unpublish")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size={size} onClick={open}>
              <EyeOff /> {t("unpublish")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")}>
              <Textarea id="reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}
      {!compact ? (
        <DialogForm
          action={featureProductAction}
          hidden={{ productId, featured: isFeatured ? "false" : "true" }}
          title={isFeatured ? t("unfeature") : t("feature")}
          description={t("featureHint")}
          submitLabel={tc("save")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size={size} onClick={open}>
              <Star /> {isFeatured ? t("unfeature") : t("feature")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <div className="grid gap-4 sm:grid-cols-2">
              {!isFeatured ? (
                <Field label={t("featureDays")} htmlFor="days" error={fieldError("days")}>
                  <Input id="days" name="days" type="number" min={1} max={365} defaultValue={30} />
                </Field>
              ) : null}
              <Field label={t("searchBoost")} htmlFor="searchBoost" error={fieldError("searchBoost")} hint={t("searchBoostHint")}>
                <Input id="searchBoost" name="searchBoost" type="number" min={0} max={100} defaultValue={searchBoost} />
              </Field>
            </div>
          )}
        </DialogForm>
      ) : null}
    </div>
  );
}
