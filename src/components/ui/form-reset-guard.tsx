"use client";

import * as React from "react";

/**
 * React 19 resets every uncontrolled field once a `<form action>` finishes — also when the server action
 * only returned a validation error, which wiped what people had typed (passwords, addresses, long
 * descriptions) and snapped selects back to their first option. React resets through the native
 * `form.reset()`, whose "reset" event is cancelable: when the form is showing an action error
 * (`[data-action-error]`, rendered by FormError and Field) we cancel it and the values stay.
 */
export function FormResetGuard() {
  React.useEffect(() => {
    const onReset = (e: Event) => {
      const form = e.target;
      if (form instanceof HTMLFormElement && form.querySelector("[data-action-error]")) e.preventDefault();
    };
    document.addEventListener("reset", onReset, true);
    return () => document.removeEventListener("reset", onReset, true);
  }, []);
  return null;
}
