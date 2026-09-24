import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { PATH_HEADER } from "./lib/request-path";

const handleI18n = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Pass the requested path (without locale, with query) to server components, so a dashboard that
  // sends a signed-out visitor to /login can bring them back to the exact page afterwards.
  // next-intl copies the incoming request headers into its rewrite/next response.
  const { pathname, search } = request.nextUrl;
  const path = pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";
  request.headers.set(PATH_HEADER, `${path}${search}`);
  return handleI18n(request);
}

export const config = {
  // Skip API routes, Next internals, static files and the sitemap/robots endpoints.
  matcher: ["/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|favicon\\.ico|uploads|.*\\..*).*)"],
};
