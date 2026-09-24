import type { ZodSchema, ZodTypeDef } from "zod";

/**
 * Standard result shape for every Server Action in the platform.
 * Client forms render `error` (top-level) and `fieldErrors` (per input).
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string; /** Set when the action called redirect(): the client navigates (see useActionForm). */ redirect?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; code?: string };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail<T = undefined>(error: string, extra: { fieldErrors?: Record<string, string[]>; code?: string } = {}): ActionResult<T> {
  return { ok: false, error, ...extra };
}

export class ActionError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, code = "ACTION_ERROR", fieldErrors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends ActionError {
  constructor(message = "You need to sign in to continue.") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends ActionError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends ActionError {
  constructor(message = "Not found.") {
    super(message, "NOT_FOUND");
  }
}

/** Parse form input with a zod schema; returns a typed failure on validation error. */
export function parseInput<Out, In = unknown>(
  schema: ZodSchema<Out, ZodTypeDef, In>,
  input: unknown,
): { success: true; data: Out } | { success: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    success: false,
    result: { ok: false, error: "Please fix the highlighted fields.", fieldErrors, code: "VALIDATION" },
  };
}

/**
 * Wrap a server action body so thrown ActionErrors become typed failures instead of 500s.
 * Unexpected errors are logged and mapped to a generic message (never leak internals).
 */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.message, code: err.code, fieldErrors: err.fieldErrors };
    }
    // Next.js redirect()/notFound() throw special errors that must propagate — except redirects, which are
    // handed to the client as data: a redirect thrown from an action occasionally never navigates in the
    // App Router (the page stays put with the button spinning although the work is done), so the form
    // navigates itself (useActionForm) with a hard-navigation fallback.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      const digest = (err as { digest: string }).digest;
      if (digest.startsWith("NEXT_REDIRECT;")) {
        const url = digest.split(";")[2];
        if (url && url.startsWith("/") && !url.startsWith("//")) return { ok: true, data: undefined as T, redirect: url };
      }
      throw err;
    }
    console.error("[action] unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" };
  }
}

/** Convert FormData to a plain object (repeated keys become arrays; "on" checkboxes → true). */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const v = typeof value === "string" ? value : value; // File stays File
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      (out[k] ??= []) as unknown[];
      (out[k] as unknown[]).push(v);
    } else if (key in out) {
      const existing = out[key];
      out[key] = Array.isArray(existing) ? [...existing, v] : [existing, v];
    } else {
      out[key] = v;
    }
  }
  return out;
}
