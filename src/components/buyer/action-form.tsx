"use client";

import * as React from "react";
import { Button, Dialog, FormError, SubmitButton, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";

type ServerAction<T> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "subtle" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg";

/**
 * One-click server action rendered as a form (so it works without JS) with a toast on success.
 * `hidden` carries the entity ids; `refresh` re-renders the server component after the action.
 */
export function ActionForm<T>({
  action,
  hidden = {},
  label,
  icon,
  variant = "secondary",
  size = "sm",
  className,
  redirectTo,
  refresh = true,
  children,
}: {
  action: ServerAction<T>;
  hidden?: Record<string, string | number | boolean | undefined | null>;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  redirectTo?: (data: T) => string;
  refresh?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { formAction } = useActionForm(action, {
    onSuccess: (data) => {
      if (redirectTo) router.push(redirectTo(data));
      else if (refresh) router.refresh();
    },
  });
  return (
    <form action={formAction} className={cn("inline-flex", className)}>
      {Object.entries(hidden).map(([k, v]) => (v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
      {children}
      {label ? (
        <SubmitButton variant={variant} size={size}>
          {icon}
          {label}
        </SubmitButton>
      ) : null}
    </form>
  );
}

/**
 * Button that opens a modal containing a server-action form — used for every buyer decision that
 * needs a reason, an address or a few extra fields (reject quotation, open dispute, …).
 */
export function DialogForm<T>({
  action,
  trigger,
  title,
  description,
  hidden = {},
  submitLabel,
  cancelLabel = "Cancel",
  submitVariant = "primary",
  size = "md",
  redirectTo,
  refresh = true,
  onDone,
  children,
}: {
  action: ServerAction<T>;
  trigger: (open: () => void) => React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  hidden?: Record<string, string | number | boolean | undefined | null>;
  submitLabel: React.ReactNode;
  cancelLabel?: string;
  submitVariant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "xl";
  redirectTo?: (data: T) => string;
  refresh?: boolean;
  onDone?: (data: T) => void;
  children: (helpers: { fieldError: (name: string) => string | undefined; pending: boolean }) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { state, formAction, fieldError, pending } = useActionForm(action, {
    onSuccess: (data) => {
      setOpen(false);
      onDone?.(data);
      if (redirectTo) router.push(redirectTo(data));
      else if (refresh) router.refresh();
    },
  });
  return (
    <>
      {trigger(() => setOpen(true))}
      {/* The form is mounted only while the dialog is open: closed <dialog> content is not
          interactive and Chrome mutates hidden inputs inside it, which breaks hydration. */}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        {open ? (
        <form action={formAction} className="space-y-4">
          {Object.entries(hidden).map(([k, v]) => (v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
          {children({ fieldError, pending })}
          <FormError state={state} />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
          </div>
        </form>
        ) : null}
      </Dialog>
    </>
  );
}
