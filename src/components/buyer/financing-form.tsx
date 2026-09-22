"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload } from "@/components/buyer/file-upload";
import { Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { applyForFinancingAction } from "@/modules/financing/actions";
import { BUYER_FINANCING_PRODUCTS } from "@/modules/financing/schemas";

export type FinancingOrderOption = { id: string; orderNumber: string; supplierName: string; total: number; currency: string };

export function FinancingForm({ orders, defaults }: { orders: FinancingOrderOption[]; defaults: { orderId?: string | null; amount?: number | null; currency?: string } }) {
  const t = useTranslations("financing.form");
  const router = useRouter();
  const [product, setProduct] = React.useState<(typeof BUYER_FINANCING_PRODUCTS)[number]>("IMPORT_FINANCING");
  const { state, formAction, fieldError } = useActionForm(applyForFinancingAction, {
    onSuccess: (data) => router.push(`/buyer/financing/${data.id}`),
  });

  return (
    <form action={formAction} className="space-y-5">
      <Card>
        <CardHeader title={t("title")} description={t("description")} />
        <CardContent className="space-y-4">
          <Field label={t("order")} htmlFor="orderId" error={fieldError("orderId")} hint={t("orderHint")}>
            <Select id="orderId" name="orderId" defaultValue={defaults.orderId ?? ""}>
              <option value="">{t("orderNone")}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.supplierName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("productType")} htmlFor="productType" error={fieldError("productType")} required hint={t(`productHints.${product}`)}>
            <Select id="productType" name="productType" value={product} onChange={(e) => setProduct(e.target.value as typeof product)} required>
              {BUYER_FINANCING_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {t(`products.${p}`)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("amount")} htmlFor="amount" error={fieldError("amount")} required>
              <Input id="amount" name="amount" inputMode="decimal" defaultValue={defaults.amount ?? ""} required />
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")}>
              <Select id="currency" name="currency" defaultValue={defaults.currency ?? "USD"}>
                {["USD", "VND", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("tenor")} htmlFor="requestedTenorDays" error={fieldError("requestedTenorDays")} required hint={t("tenorHint")}>
              <Input id="requestedTenorDays" name="requestedTenorDays" type="number" min={15} max={365} defaultValue={90} required />
            </Field>
          </div>

          <Field label={t("purpose")} htmlFor="purpose" error={fieldError("purpose")}>
            <Textarea id="purpose" name="purpose" rows={3} placeholder={t("purposePlaceholder")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("financials")} description={t("financialsHint")} />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("annualRevenue")} htmlFor="annualRevenue" error={fieldError("annualRevenue")}>
              <Input id="annualRevenue" name="annualRevenue" inputMode="decimal" />
            </Field>
            <Field label={t("receivables")} htmlFor="receivables" error={fieldError("receivables")}>
              <Input id="receivables" name="receivables" inputMode="decimal" />
            </Field>
          </div>
          <FileUpload name="documentIds" scope="financing" label={t("documents")} hint={t("documentsHint")} max={6} />
          <Field label={t("notes")} htmlFor="notes" error={fieldError("notes")}>
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <Checkbox name="consent" label={t("consent")} description={t("consentHint")} required />
          {fieldError("consent") ? (
            <p className="mt-1.5 text-xs text-danger-600" role="alert">
              {fieldError("consent")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="flex justify-end">
        <SubmitButton variant="primary">{t("submit")}</SubmitButton>
      </div>
    </form>
  );
}
