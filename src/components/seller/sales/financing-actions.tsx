"use client";

import { Check, Landmark, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { acceptSellerFinancingOfferAction, applySellerFinancingAction, withdrawSellerFinancingAction } from "@/modules/seller/sales/financing/actions";
import { SELLER_FINANCING_PRODUCTS } from "@/modules/seller/sales/financing/schemas";

export type FinanceableOrder = { id: string; orderNumber: string; total: number; currency: string; buyerName: string };

export function ApplyFinancingButton({ orders, defaultOrderId, locale }: { orders: FinanceableOrder[]; defaultOrderId?: string; locale: string }) {
  const t = useTranslations("sales.financing");
  const preselected = orders.find((o) => o.id === defaultOrderId) ?? orders[0];
  return (
    <DialogForm
      action={applySellerFinancingAction}
      title={t("applyTitle")}
      description={t("applyDescription")}
      submitLabel={t("applySubmit")}
      size="lg"
      redirectTo={(data) => `/seller/financing/${data.id}`}
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open}>
          <Landmark /> {t("apply")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("productType")} htmlFor="fin-product" error={fieldError("productType")} required>
            <Select id="fin-product" name="productType" defaultValue="PRODUCTION_FINANCING" required>
              {SELLER_FINANCING_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {t(`products.${p}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("order")} htmlFor="fin-order" error={fieldError("orderId")} hint={t("orderHint")}>
            <Select id="fin-order" name="orderId" defaultValue={preselected?.id ?? ""}>
              <option value="">{t("orderNone")}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} · {o.buyerName} · {formatMoney(o.total, o.currency, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("amount")} htmlFor="fin-amount" error={fieldError("amount")} required className="sm:col-span-2">
              <Input id="fin-amount" name="amount" inputMode="decimal" defaultValue={preselected ? Math.round(preselected.total * 0.7) : ""} placeholder="0.00" required />
            </Field>
            <Field label={t("currency")} htmlFor="fin-currency" error={fieldError("currency")}>
              <Select id="fin-currency" name="currency" defaultValue={preselected?.currency ?? "USD"}>
                {["USD", "VND", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("tenor")} htmlFor="fin-tenor" error={fieldError("requestedTenorDays")} hint={t("tenorHint")} required>
            <Input id="fin-tenor" name="requestedTenorDays" type="number" min={15} max={365} defaultValue={90} required />
          </Field>
          <Field label={t("purpose")} htmlFor="fin-purpose" error={fieldError("purpose")}>
            <Textarea id="fin-purpose" name="purpose" rows={3} placeholder={t("purposePlaceholder")} />
          </Field>
          <Checkbox name="consent" label={t("consent")} description={t("consentHint")} required />
          {fieldError("consent") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("consent")}
            </p>
          ) : null}
        </div>
      )}
    </DialogForm>
  );
}

export function AcceptSellerOfferButton({ applicationId, offerId, amount, currency, locale }: { applicationId: string; offerId: string; amount: number; currency: string; locale: string }) {
  const t = useTranslations("sales.financing");
  return (
    <DialogForm
      action={acceptSellerFinancingOfferAction}
      hidden={{ applicationId, offerId }}
      title={t("acceptTitle")}
      description={t("acceptDescription")}
      submitLabel={t("acceptSubmit")}
      trigger={(open) => (
        <Button type="button" variant="primary" size="sm" onClick={open}>
          <Check /> {t("accept")}
        </Button>
      )}
    >
      {() => (
        <p className="text-sm text-steel-600">
          {t("offerAmount")}: <span className="font-medium text-ink-900">{formatMoney(amount, currency, locale)}</span>
        </p>
      )}
    </DialogForm>
  );
}

export function WithdrawSellerApplicationButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations("sales.financing");
  return (
    <DialogForm
      action={withdrawSellerFinancingAction}
      hidden={{ applicationId }}
      title={t("withdrawTitle")}
      description={t("withdrawDescription")}
      submitLabel={t("withdrawSubmit")}
      submitVariant="danger"
      trigger={(open) => (
        <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
          <XCircle /> {t("withdraw")}
        </Button>
      )}
    >
      {() => null}
    </DialogForm>
  );
}
