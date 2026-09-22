import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

/** Default social image for public pages (1200×630). */
export const DEFAULT_OG_IMAGE = "/og-default.svg";

/** `buildMetadata` with the marketplace's default OpenGraph image applied. */
export function pageMetadata(opts: Parameters<typeof buildMetadata>[0]): Metadata {
  return buildMetadata({ image: DEFAULT_OG_IMAGE, ...opts });
}
