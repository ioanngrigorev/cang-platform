"use client";

import * as React from "react";
import { useActionState } from "react";
import type { ActionResult } from "@/lib/action";
import { Alert } from "./card";
import { useToast } from "./toast";

type ServerAction<T> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

/**
 * Wires a Server Action to a <form>: handles pending state, field errors and success toasts.
 *
 *   const { state, formAction, fieldError } = useActionForm(loginAction);
 *   <form action={formAction}> <Field error={fieldError("email")}>…</Field> <FormError state={state} /> <SubmitButton/> </form>
 */
export function useActionForm<T = undefined>(action: ServerAction<T>, opts: { onSuccess?: (data: T, message?: string) => void; successToast?: boolean } = {}) {
  const [state, formAction, pending] = useActionState(action, null);
  const { toast } = useToast();
  const lastHandled = React.useRef<ActionResult<T> | null>(null);
  React.useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok) {
      if (opts.successToast !== false && state.message) toast({ title: state.message, variant: "success" });
      opts.onSuccess?.(state.data, state.message);
    } else if (state.code !== "VALIDATION") {
      toast({ title: state.error, variant: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);
  return { state, formAction, pending, fieldError };
}

export function FormError({ state, className }: { state: ActionResult<unknown> | null; className?: string }) {
  if (!state || state.ok) return null;
  return (
    <Alert variant="danger" className={className}>
      {state.error}
      {state.fieldErrors?._root?.length ? <div className="mt-1 text-xs">{state.fieldErrors._root.join(" ")}</div> : null}
    </Alert>
  );
}

export function FormSuccess({ state, className }: { state: ActionResult<unknown> | null; className?: string }) {
  if (!state || !state.ok || !state.message) return null;
  return (
    <Alert variant="success" className={className}>
      {state.message}
    </Alert>
  );
}
