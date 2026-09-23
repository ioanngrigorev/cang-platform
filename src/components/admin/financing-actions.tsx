"use client";

import { Banknote, Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { financingDecisionAction, recordFinancingOfferAction, toggleFinancingProviderAction } from "@/modules/admin/financing/actions";

export function FinancingAppActions({
  applicationId,
  status,
  amount,
  currency,
  tenorDays,
  providers,
  defaultProviderId,
  canWrite,
}: {
  applicationId: string;
  status: string;
  amount: number;
  currency: string;
  tenorDays: number | null;
  providers: Array<{ id: string; name: string }>;
  defaultProviderId: string | null;
  canWrite: boolean;
}) {
  const t = useTranslations("admin.financing");
  const tc = useTranslations("admin.common");
  if (!canWrite) return null;
  const open = ["SUBMITTED", "ROUTED", "UNDER_REVIEW", "OFFERED"].includes(status);
  const decision = (d: "DECLINED" | "FUNDED" | "REPAID", label: string, variant: "primary" | "danger" | "secondary") => (
    <DialogForm
      key={d}
      action={financingDecisionAction}
      hidden={{ applicationId, decision: d }}
      title={label}
      submitLabel={label}
      submitVariant={variant}
      cancelLabel={tc("cancel")}
      trigger={(o) => (
        <Button variant={variant === "danger" ? "ghost" : variant} size="xs" onClick={o}>
          {d === "DECLINED" ? <X /> : <Check />} {label}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <Field label={d === "DECLINED" ? tc("reason") : tc("note")} htmlFor="reason" error={fieldError("reason")} required={d === "DECLINED"}>
          <Textarea id="reason" name="reason" rows={3} required={d === "DECLINED"} />
        </Field>
      )}
    </DialogForm>
  );
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {status === "SUBMITTED" || status === "ROUTED" ? <ActionForm action={financingDecisionAction} hidden={{ applicationId, decision: "UNDER_REVIEW" }} label={t("review")} icon={<Search />} size="xs" /> : null}
      {open ? (
        <DialogForm
          action={recordFinancingOfferAction}
          hidden={{ applicationId }}
          title={t("recordOffer")}
          description={t("recordOfferHint")}
          submitLabel={t("recordOffer")}
          cancelLabel={tc("cancel")}
          size="lg"
          trigger={(o) => (
            <Button variant="secondary" size="xs" onClick={o}>
              <Banknote /> {t("recordOffer")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("provider")} htmlFor="providerId" error={fieldError("providerId")} required>
                  <Select id="providerId" name="providerId" defaultValue={defaultProviderId ?? providers[0]?.id ?? ""}>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("amount", { currency })} htmlFor="amount" error={fieldError("amount")} required>
                  <Input id="amount" name="amount" type="number" step="0.01" min={0} defaultValue={amount} required />
                </Field>
                <Field label={t("interestRate")} htmlFor="interestRate" error={fieldError("interestRate")}>
                  <Input id="interestRate" name="interestRate" type="number" step="0.01" min={0} />
                </Field>
                <Field label={t("feePercent")} htmlFor="feePercent" error={fieldError("feePercent")}>
                  <Input id="feePercent" name="feePercent" type="number" step="0.01" min={0} defaultValue={1} />
                </Field>
                <Field label={t("tenorDays")} htmlFor="tenorDays" error={fieldError("tenorDays")} required>
                  <Input id="tenorDays" name="tenorDays" type="number" min={1} defaultValue={tenorDays ?? 90} required />
                </Field>
                <Field label={t("validUntil")} htmlFor="validUntil" error={fieldError("validUntil")}>
                  <Input id="validUntil" name="validUntil" type="date" />
                </Field>
              </div>
              <Field label={t("terms")} htmlFor="terms" error={fieldError("terms")}>
                <Textarea id="terms" name="terms" rows={3} />
              </Field>
            </>
          )}
        </DialogForm>
      ) : null}
      {status === "ACCEPTED" || status === "OFFERED" ? decision("FUNDED", t("markFunded"), "primary") : null}
      {status === "FUNDED" || status === "REPAYING" ? decision("REPAID", t("markRepaid"), "primary") : null}
      {open || status === "ACCEPTED" ? decision("DECLINED", t("decline"), "danger") : null}
    </span>
  );
}

export function FinancingProviderToggle({ providerId, isActive }: { providerId: string; isActive: boolean }) {
  const tc = useTranslations("admin.common");
  return <ActionForm action={toggleFinancingProviderAction} hidden={{ providerId, isActive: isActive ? "false" : "true" }} label={isActive ? tc("deactivate") : tc("activate")} variant="ghost" size="xs" />;
}
