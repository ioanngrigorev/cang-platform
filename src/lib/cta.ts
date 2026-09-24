/**
 * Role-aware call-to-action links for public pages: the same button should take a visitor to sign-up,
 * a buyer to the supplier onboarding, and a supplier straight to their dashboard — never to a
 * registration page that bounces a signed-in user back home.
 */
type Company = { isSeller: boolean; isBuyer: boolean; isLogisticsPartner?: boolean };
type Auth = { activeMembership: { company: Company } | null } | null | undefined;

const company = (auth: Auth): Company | null => auth?.activeMembership?.company ?? null;

/** "Become a supplier": null when the visitor already is one (show a dashboard link instead). */
export function becomeSupplierHref(auth: Auth): string | null {
  if (!auth) return "/register?type=seller";
  const c = company(auth);
  if (!c) return "/onboarding?type=SELLER";
  if (c.isSeller) return null;
  return "/onboarding?enable=SELLER";
}

/** Supplier plan buttons on /pricing. */
export function sellerPlanHref(auth: Auth, planCode: string): string {
  if (!auth) return `/register?type=seller&plan=${planCode.toLowerCase()}`;
  const c = company(auth);
  if (c?.isSeller) return "/seller/subscription";
  return becomeSupplierHref(auth) ?? "/seller/subscription";
}

/** "Check your eligibility" on /financing. */
export function financingHref(auth: Auth): string {
  const c = company(auth);
  if (!auth) return `/login?next=${encodeURIComponent("/buyer/financing/new")}`;
  if (c?.isBuyer) return "/buyer/financing/new";
  if (c?.isSeller) return "/seller/financing";
  return "/onboarding?enable=BUYER&next=%2Fbuyer%2Ffinancing%2Fnew";
}

/** "Become a logistics partner". */
export function becomePartnerHref(auth: Auth): string | null {
  if (!auth) return "/register?type=logistics";
  const c = company(auth);
  if (c?.isLogisticsPartner) return null;
  return "/onboarding?type=LOGISTICS";
}
