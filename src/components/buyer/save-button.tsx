"use client";

import { Bookmark, BookmarkCheck, Heart, HeartOff, Loader2 } from "lucide-react";
import * as React from "react";
import { Button, useActionForm } from "@/components/ui";
import { toggleSavedProduct, toggleSavedSupplier } from "@/modules/saved/actions";
import { cn } from "@/lib/utils";

type Props = {
  kind: "supplier" | "product";
  id: string;
  saved: boolean;
  labelSave: string;
  labelSaved: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Icon-only below the sm breakpoint (compact headers). */
  compactLabel?: boolean;
  variant?: "secondary" | "ghost" | "subtle";
  className?: string;
};

/** Optimistic save/unsave toggle used on supplier and product cards across the buyer dashboard. */
export function SaveButton({ kind, id, saved, labelSave, labelSaved, size = "sm", variant = "secondary", className, compactLabel = false }: Props) {
  const action = kind === "supplier" ? toggleSavedSupplier : toggleSavedProduct;
  const [isSaved, setIsSaved] = React.useState(saved);
  const { formAction, pending } = useActionForm(action, { onSuccess: (data) => setIsSaved(data.saved) });
  React.useEffect(() => setIsSaved(saved), [saved]);

  const SavedIcon = kind === "supplier" ? BookmarkCheck : Heart;
  const UnsavedIcon = kind === "supplier" ? Bookmark : HeartOff;

  return (
    <form action={formAction} className={cn("inline-flex", className)}>
      <input type="hidden" name={kind === "supplier" ? "supplierCompanyId" : "productId"} value={id} />
      <Button type="submit" variant={variant} size={size} disabled={pending} aria-pressed={isSaved}>
        {pending ? <Loader2 className="animate-spin" /> : isSaved ? <SavedIcon className={kind === "product" ? "fill-danger-500 text-danger-500" : "text-brass-600"} /> : <UnsavedIcon />}
        <span className={compactLabel ? "hidden sm:inline" : undefined}>{isSaved ? labelSaved : labelSave}</span>
      </Button>
    </form>
  );
}
