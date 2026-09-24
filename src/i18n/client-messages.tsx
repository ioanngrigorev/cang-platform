import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * Translations the browser needs everywhere: the header (search, user menu) and the error page.
 * Server components read the full catalogue through getTranslations and are not affected.
 */
const BASE = ["common", "nav", "marketplace.typeahead", "errors"] as const;

type Tree = Record<string, unknown>;

function pick(all: Tree, paths: readonly string[]): Tree {
  const out: Tree = {};
  for (const path of paths) {
    const parts = path.split(".");
    let src: unknown = all;
    for (const p of parts) src = src && typeof src === "object" ? (src as Tree)[p] : undefined;
    if (src === undefined) continue;
    let dst = out;
    parts.slice(0, -1).forEach((p) => { dst = (dst[p] ??= {}) as Tree; });
    dst[parts[parts.length - 1]] = src;
  }
  return out;
}

/**
 * Ship only the namespaces a section's client components use. Every page used to carry all 18
 * namespaces (≈214 KB of JSON, admin and seller included) in its HTML. Nested providers replace
 * rather than merge messages, so each call includes the base set plus its own.
 */
export async function ClientMessages({ namespaces = [], children }: { namespaces?: readonly string[]; children: ReactNode }) {
  const all = (await getMessages()) as Tree;
  return <NextIntlClientProvider messages={pick(all, [...BASE, ...namespaces])}>{children}</NextIntlClientProvider>;
}

export const DASHBOARD_NAMESPACES = {
  buyer: ["buyer", "rfq", "orders", "payments", "logistics", "tracking", "financing", "messaging", "dashboard"],
  seller: ["seller", "sales", "buyer", "rfq", "orders", "payments", "logistics", "tracking", "financing", "messaging", "dashboard"],
  admin: ["admin", "buyer", "tracking", "logistics"],
  partner: ["partner", "tracking", "logistics", "buyer", "seller.api", "dashboard"],
  onboarding: ["auth"],
} as const;
