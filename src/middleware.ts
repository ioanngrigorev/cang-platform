import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, static files and the sitemap/robots endpoints.
  matcher: ["/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|favicon\\.ico|uploads|.*\\..*).*)"],
};
