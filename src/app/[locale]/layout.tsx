import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HolidayBanner } from "@/components/layout/holiday-banner";
import { activeHoliday } from "@/lib/holidays";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
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
  const messages = await getMessages();
  // Theme is a cookie so the first server render already carries it and nothing flashes.
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  const holiday = activeHoliday();
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {holiday ? <HolidayBanner holiday={holiday} locale={locale} /> : null}
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
