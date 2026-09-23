"use client";

import * as React from "react";

/**
 * React 19 resets uncontrolled fields after a `<form action>` completes — even when the server
 * action only returned a validation error. Dispatching the action ourselves keeps what the user typed.
 */
export function preservingSubmit(formAction: (payload: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const fd = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : undefined);
    React.startTransition(() => formAction(fd));
  };
}
