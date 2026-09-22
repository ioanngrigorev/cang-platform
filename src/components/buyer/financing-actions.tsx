"use client";

import { Check, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { acceptFinancingOfferAction, withdrawFinancingAction } from "@/modules/financing/actions";

export function AcceptOfferButton({
  applicationId,
  offerId,
  amount,
  currency,
  locale,
}: {
  applicationId: string;
  offerId: string;
  amount: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("financing.detail");
  return (
    <DialogForm
      action={acceptFinancingOfferAction}
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

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations("financing.detail");
  return (
    <DialogForm
      action={withdrawFinancingAction}
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
