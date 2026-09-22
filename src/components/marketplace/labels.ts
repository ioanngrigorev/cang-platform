/**
 * Card label bundles built from the `marketplace.card` namespace.
 * ProductCard / SupplierCard take plain strings so they can be rendered from both server and client components.
 */
export type Translator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  raw: (key: string) => string;
};

export function productCardLabels(t: Translator) {
  return {
    moq: t("card.moq"),
    leadTime: t("card.leadTime"),
    days: t.raw("card.days"),
    contact: t("card.contact"),
    negotiable: t("card.negotiable"),
    oem: t("card.oem"),
    odm: t("card.odm"),
    perUnit: t.raw("card.perUnit"),
  };
}

export function supplierCardLabels(t: Translator) {
  return {
    products: t("card.products"),
    established: t("card.established"),
    employees: t("card.employees"),
    leadTime: t("card.leadTime"),
    days: t.raw("card.days"),
    oem: t("card.oem"),
    odm: t("card.odm"),
    responseRate: t("card.responseRate"),
    exportMarkets: t("card.exportMarkets"),
    view: t("card.view"),
  };
}

/** Localised country display name (Intl first, ISO code as a fallback). */
export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  try {
    const dn = new Intl.DisplayNames([locale === "vi" ? "vi" : "en"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

export function rfqCardLabels(t: Translator) {
  return {
    quantity: t("rfq.quantity"),
    destination: t("rfq.destination"),
    deadline: t("rfq.deadline"),
    targetPrice: t("rfq.targetPrice"),
    quotations: (count: number) => t("rfq.quotations", { count }),
    buyerFrom: (country: string) => t("rfq.buyerFrom", { country }),
    verifiedBuyer: t("rfq.verifiedBuyer"),
    priority: t("rfq.priority"),
    view: t("rfq.viewRfq"),
    notSpecified: t("rfq.notSpecified"),
  };
}
