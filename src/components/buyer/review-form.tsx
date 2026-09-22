"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { StarInput } from "@/components/buyer/star-input";
import { Card, CardContent, CardHeader, Field, FormError, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { createReviewAction } from "@/modules/reviews/actions";

export type ReviewableOrder = { id: string; orderNumber: string; supplierName: string };

export function ReviewForm({ orders, defaultOrderId }: { orders: ReviewableOrder[]; defaultOrderId?: string }) {
  const t = useTranslations("buyer.reviews");
  const router = useRouter();
  const { state, formAction, fieldError } = useActionForm(createReviewAction, {
    onSuccess: () => router.push("/buyer/reviews"),
  });

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardHeader title={t("newTitle")} description={t("newDescription")} />
        <CardContent className="space-y-5">
          <Field label={t("chooseOrder")} htmlFor="orderId" error={fieldError("orderId")} required hint={t("chooseOrderHint")}>
            <Select id="orderId" name="orderId" defaultValue={defaultOrderId ?? orders[0]?.id ?? ""} required>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.supplierName}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <StarInput name="ratingQuality" label={t("quality")} hint={t("qualityHint")} error={fieldError("ratingQuality")} />
            <StarInput name="ratingCommunication" label={t("communication")} hint={t("communicationHint")} error={fieldError("ratingCommunication")} />
            <StarInput name="ratingDelivery" label={t("delivery")} hint={t("deliveryHint")} error={fieldError("ratingDelivery")} />
            <StarInput name="ratingAccuracy" label={t("accuracy")} hint={t("accuracyHint")} error={fieldError("ratingAccuracy")} />
            <StarInput name="ratingService" label={t("service")} hint={t("serviceHint")} error={fieldError("ratingService")} />
          </div>

          <Field label={t("reviewTitle")} htmlFor="title" error={fieldError("title")}>
            <Input id="title" name="title" maxLength={200} placeholder={t("reviewTitlePlaceholder")} />
          </Field>
          <Field label={t("reviewBody")} htmlFor="body" error={fieldError("body")}>
            <Textarea id="body" name="body" rows={6} placeholder={t("reviewBodyPlaceholder")} />
          </Field>
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end">
        <SubmitButton variant="primary">
          <Star /> {t("submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
