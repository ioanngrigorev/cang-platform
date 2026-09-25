import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/*/buyer", "/*/seller", "/*/admin", "/*/partner", "/*/onboarding", "/*/login", "/*/register", "/*/reset-password", "/*/verify-email"] },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
