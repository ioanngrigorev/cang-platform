import { defineRouting } from "next-intl/routing";

export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Locales the platform is architected to add later (translations not yet provided). */
export const plannedLocales = ["zh", "ko", "ja", "ru", "th", "id"] as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
