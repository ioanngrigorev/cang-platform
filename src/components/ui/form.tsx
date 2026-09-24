"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const lastHandled = React.useRef<ActionResult<T> | null>(null);
  React.useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.ok && state.redirect) {
      navigateAfterAction(router, state.redirect);
      return;
    }
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

/** Client navigation to where the action redirected, with a full page load if the router does not get there. */
export function navigateAfterAction(router: { push: (href: string) => void }, href: string) {
  const target = new URL(href, window.location.origin);
  router.push(target.pathname + target.search);
  window.setTimeout(() => {
    if (window.location.pathname !== target.pathname) window.location.assign(target.pathname + target.search);
  }, 4000);
}

export function FormError({ state, className }: { state: ActionResult<unknown> | null; className?: string }) {
  if (!state || state.ok) return null;
  // data-action-error: FormResetGuard keeps what the user typed when this form's action failed.
  return (
    <div data-action-error="" className={className}>
      <Alert variant="danger">
        {state.error}
        {state.fieldErrors?._root?.length ? <div className="mt-1 text-xs">{state.fieldErrors._root.join(" ")}</div> : null}
      </Alert>
    </div>
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
