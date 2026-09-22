"use client";

import { XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { DialogForm } from "@/components/buyer/action-form";
import { Button } from "@/components/ui";
import { cancelInspectionAction } from "@/modules/inspection/actions";

export function CancelInspection({ inspectionId }: { inspectionId: string }) {
  const t = useTranslations("buyer.inspections");
  return (
    <DialogForm
      action={cancelInspectionAction}
      hidden={{ inspectionId }}
      title={t("cancelTitle")}
      description={t("cancelDescription")}
      submitLabel={t("cancelSubmit")}
      submitVariant="danger"
      trigger={(open) => (
        <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
          <XCircle /> {t("cancel")}
        </Button>
      )}
    >
      {() => null}
    </DialogForm>
  );
}
