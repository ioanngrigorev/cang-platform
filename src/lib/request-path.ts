/** Request header set by the middleware: the requested path without the locale prefix, plus the query. */
export const PATH_HEADER = "x-cang-path";

/**
 * `/login?next=…` for the page being requested, so signing in returns the visitor to it.
 * Server-only (reads request headers); falls back to `fallback` outside a request.
 */
export async function loginHrefForCurrentPath(fallback: string): Promise<string> {
  return `/login?next=${encodeURIComponent(await currentPath(fallback))}`;
}

/** The requested path (without locale) or `fallback`. */
export async function currentPath(fallback: string): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const requested = h.get(PATH_HEADER);
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) return requested;
  } catch {
    // not in a request scope
  }
  return fallback;
}
