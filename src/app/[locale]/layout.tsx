import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HolidayBanner } from "@/components/layout/holiday-banner";
import { activeHoliday } from "@/lib/holidays";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
import { FormResetGuard } from "@/components/ui/form-reset-guard";
import { ClientMessages } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

/**
 * Search-engine ownership tokens come from the environment (/opt/cang/.env on the server), so
 * Search Console and Bing can be verified with a container restart instead of a code change.
 */
export async function generateMetadata(): Promise<Metadata> {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  return {
    ...baseMetadata,
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "CANG – Source from verified Vietnamese manufacturers", template: "%s | CANG" },
  description: "CANG is Vietnam's B2B marketplace: verified manufacturers, RFQs, trade assurance, logistics and financing for global buyers.",
  icons: { icon: "/favicon.svg" },
  // Default social card; pages built with `pageMetadata` override title/description and may set their own image.
  openGraph: { siteName: "CANG", type: "website", images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "CANG – Vietnam B2B industrial marketplace" }] },
  twitter: { card: "summary_large_image" },
};

// All routes render on demand: content is DB-driven and the header is session-aware.
// Per-query caching (unstable_cache / revalidateTag) can be layered on hot public pages later.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Theme is a cookie so the first server render already carries it and nothing flashes.
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  const holiday = activeHoliday();
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <FormResetGuard />
        <ClientMessages>
          {holiday ? <HolidayBanner holiday={holiday} locale={locale} /> : null}
          <ToastProvider>{children}</ToastProvider>
        </ClientMessages>
      </body>
    </html>
  );
}
