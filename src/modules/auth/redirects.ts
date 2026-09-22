/** Where a user lands after sign-in, based on their platform role and the company they act for. */
export function defaultHomeFor(role: string | null | undefined, company: { isSeller: boolean; isBuyer: boolean } | null): string {
  if (role && role !== "USER") return "/admin";
  if (!company) return "/onboarding";
  if (company.isSeller) return "/seller";
  return "/buyer";
}
