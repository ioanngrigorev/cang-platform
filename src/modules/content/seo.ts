import type { Metadata } from "next";
import { buildMetadata, defaultOgImage } from "@/lib/seo";

/** `buildMetadata` with the marketplace's default social card (1200×630 PNG, per locale) applied. */
export function pageMetadata(opts: Parameters<typeof buildMetadata>[0]): Metadata {
  return buildMetadata({ ...opts, image: opts.image ?? defaultOgImage(String(opts.locale)).url });
}
