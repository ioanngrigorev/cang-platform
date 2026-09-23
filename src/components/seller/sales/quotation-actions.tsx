"use client";

import { MessageSquare, PencilLine, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Textarea } from "@/components/ui";
import { deleteDraftQuotationAction, withdrawQuotationAction } from "@/modules/seller/sales/quotations/actions";

export function QuotationActions({
  quotationId,
  rfqId,
  buyerCompanyId,
  status,
  canRevise,
  canWithdraw,
}: {
  quotationId: string;
  rfqId: string;
  buyerCompanyId: string;
  status: string;
  canRevise: boolean;
  canWithdraw: boolean;
}) {
  const t = useTranslations("sales.quotationDetail");
  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" ? (
        <>
          <Button href={`/seller/quotations/new?rfq=${rfqId}`} variant="primary">
            <PencilLine /> {t("continueDraft")}
          </Button>
          <DialogForm
            action={deleteDraftQuotationAction}
            hidden={{ quotationId }}
            title={t("deleteTitle")}
            description={t("deleteDescription")}
            submitLabel={t("deleteSubmit")}
            submitVariant="danger"
            refresh={false}
            trigger={(open) => (
              <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
                <Trash2 /> {t("deleteDraft")}
              </Button>
            )}
          >
            {() => null}
          </DialogForm>
        </>
      ) : null}

      {canRevise ? (
        <Button href={`/seller/quotations/${quotationId}/revise`} variant="primary">
          <RefreshCw /> {t("revise")}
        </Button>
      ) : null}

      <Button href={`/seller/messages/new?quotation=${quotationId}&rfq=${rfqId}&company=${buyerCompanyId}`} variant="secondary">
        <MessageSquare /> {t("messageBuyer")}
      </Button>

      {canWithdraw ? (
        <DialogForm
          action={withdrawQuotationAction}
          hidden={{ quotationId }}
          title={t("withdrawTitle")}
          description={t("withdrawDescription")}
          submitLabel={t("withdrawSubmit")}
          submitVariant="danger"
          trigger={(open) => (
            <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
              <Undo2 /> {t("withdraw")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("withdrawReason")} htmlFor="withdraw-reason" error={fieldError("reason")} hint={t("withdrawReasonHint")}>
              <Textarea id="withdraw-reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      ) : null}
    </div>
  );
}
