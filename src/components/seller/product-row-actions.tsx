"use client";

import { Copy, EyeOff, Pencil, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm } from "@/components/buyer/action-form";
import { Button, Dialog, FormError, SubmitButton, useActionForm, useToast } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { deleteProductAction, duplicateProductAction, submitProductAction, unpublishProductAction } from "@/modules/seller/products/actions";

const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-steel-500 transition-colors hover:bg-steel-100 hover:text-ink-900 disabled:opacity-50 [&_svg]:size-4";

/**
 * Per-row controls on the catalog table. Publish/unpublish/duplicate call the server action
 * directly; delete asks for confirmation first.
 */
export function ProductRowActions({ productId, status, canPublish, canWrite }: { productId: string; status: string; canPublish: boolean; canWrite: boolean }) {
  const t = useTranslations("seller.products");
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, startTransition] = React.useTransition();
  const del = useActionForm(deleteProductAction, {
    onSuccess: () => {
      setConfirmDelete(false);
      router.refresh();
    },
  });

  function run(action: typeof submitProductAction, redirectTo?: (id: string) => string) {
    const fd = new FormData();
    fd.set("productId", productId);
    startTransition(async () => {
      const res = await action(null, fd);
      if (res.ok) {
        if (res.message) toast({ title: res.message, variant: "success" });
        if (redirectTo) router.push(redirectTo(res.data.id));
        else router.refresh();
      } else {
        toast({ title: res.error, variant: "error" });
      }
    });
  }

  const canSubmit = canPublish && (status === "DRAFT" || status === "INACTIVE" || status === "REJECTED" || status === "ARCHIVED");
  const canUnpublish = canPublish && (status === "ACTIVE" || status === "PENDING_REVIEW");

  return (
    <>
      <div className="flex items-center justify-end gap-0.5">
        <Link href={`/seller/products/${productId}`} className={iconBtn} title={t("edit")} aria-label={t("edit")}>
          <Pencil />
        </Link>
        {canSubmit ? (
          <button type="button" className={cn(iconBtn, "text-brand-700 hover:text-brand-700")} disabled={busy} onClick={() => run(submitProductAction)} title={t("publish")} aria-label={t("publish")}>
            <Send />
          </button>
        ) : null}
        {canUnpublish ? (
          <button type="button" className={iconBtn} disabled={busy} onClick={() => run(unpublishProductAction)} title={t("unpublish")} aria-label={t("unpublish")}>
            <EyeOff />
          </button>
        ) : null}
        {canWrite ? (
          <button type="button" className={iconBtn} disabled={busy} onClick={() => run(duplicateProductAction, (id) => `/seller/products/${id}`)} title={t("duplicate")} aria-label={t("duplicate")}>
            <Copy />
          </button>
        ) : null}
        {canWrite ? (
          <button type="button" className={cn(iconBtn, "hover:text-danger-600")} disabled={busy} onClick={() => setConfirmDelete(true)} title={t("delete")} aria-label={t("delete")}>
            <Trash2 />
          </button>
        ) : null}
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("deleteTitle")} description={t("deleteDescription")} size="sm">
        {confirmDelete ? (
          <form action={del.formAction} className="space-y-4">
            <input type="hidden" name="productId" value={productId} />
            <FormError state={del.state} />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t("cancel")}
              </Button>
              <SubmitButton variant="danger">
                <Trash2 /> {t("deleteConfirm")}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}

/** Header button on the edit page: duplicates and jumps to the new draft. */
export function DuplicateProductButton({ productId, label }: { productId: string; label: string }) {
  return <ActionForm action={duplicateProductAction} hidden={{ productId }} label={label} icon={<Copy />} size="md" redirectTo={(d) => `/seller/products/${d.id}`} />;
}
