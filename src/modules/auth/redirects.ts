/** Where a user lands after sign-in, based on their platform role and the company they act for. */
export function defaultHomeFor(role: string | null | undefined, company: { isSeller: boolean; isBuyer: boolean; isLogisticsPartner?: boolean } | null): string {
  if (role && role !== "USER") return "/admin";
  if (!company) return "/onboarding";
  return companyHome(company);
}

/** Dashboard of a company: logistics partner portal, supplier dashboard or buyer dashboard. */
export function companyHome(company: { isSeller: boolean; isBuyer?: boolean; isLogisticsPartner?: boolean }): string {
  if (company.isLogisticsPartner && !company.isSeller && !company.isBuyer) return "/partner";
  if (company.isSeller) return "/seller";
  if (company.isLogisticsPartner && !company.isBuyer) return "/partner";
  return "/buyer";
}
