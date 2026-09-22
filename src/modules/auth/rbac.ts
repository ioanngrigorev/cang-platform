/**
 * Role-based access control.
 *
 * Two independent axes:
 *  1. Platform role (User.platformRole)  — staff permissions on the admin console.
 *  2. Company member role (CompanyMember.role) — what a user may do on behalf of a company.
 *
 * Permission keys are stable strings checked with `can()` / `canInCompany()`.
 * Keep this file the single source of truth; UI and server actions both import it.
 */

export const PLATFORM_PERMISSIONS = [
  "admin.access",
  "admin.users.read",
  "admin.users.write",
  "admin.companies.read",
  "admin.companies.write",
  "admin.verification.review",
  "admin.compliance.review",
  "admin.products.moderate",
  "admin.categories.write",
  "admin.rfqs.read",
  "admin.rfqs.write",
  "admin.orders.read",
  "admin.orders.write",
  "admin.payments.read",
  "admin.payments.write",
  "admin.financing.read",
  "admin.financing.write",
  "admin.logistics.write",
  "admin.disputes.resolve",
  "admin.reviews.moderate",
  "admin.fees.write",
  "admin.plans.write",
  "admin.advertising.write",
  "admin.cms.write",
  "admin.settings.write",
  "admin.audit.read",
  "admin.support.write",
  "admin.analytics.read",
] as const;
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export type PlatformRole = "USER" | "SUPPORT" | "MODERATOR" | "FINANCE" | "COMPLIANCE" | "ADMIN" | "SUPER_ADMIN";

const ALL_PLATFORM: PlatformPermission[] = [...PLATFORM_PERMISSIONS];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  USER: [],
  SUPPORT: [
    "admin.access",
    "admin.users.read",
    "admin.companies.read",
    "admin.rfqs.read",
    "admin.orders.read",
    "admin.payments.read",
    "admin.support.write",
  ],
  MODERATOR: [
    "admin.access",
    "admin.users.read",
    "admin.companies.read",
    "admin.products.moderate",
    "admin.reviews.moderate",
    "admin.rfqs.read",
    "admin.rfqs.write",
    "admin.cms.write",
  ],
  FINANCE: [
    "admin.access",
    "admin.companies.read",
    "admin.orders.read",
    "admin.payments.read",
    "admin.payments.write",
    "admin.financing.read",
    "admin.financing.write",
    "admin.fees.write",
    "admin.plans.write",
    "admin.analytics.read",
  ],
  COMPLIANCE: [
    "admin.access",
    "admin.users.read",
    "admin.companies.read",
    "admin.companies.write",
    "admin.verification.review",
    "admin.compliance.review",
    "admin.disputes.resolve",
    "admin.audit.read",
  ],
  ADMIN: ALL_PLATFORM.filter((p) => p !== "admin.settings.write"),
  SUPER_ADMIN: ALL_PLATFORM,
};

export const COMPANY_PERMISSIONS = [
  "company.profile.read",
  "company.profile.write",
  "company.members.manage",
  "company.verification.submit",
  "company.billing.manage",
  "company.apikeys.manage",
  "products.read",
  "products.write",
  "products.publish",
  "rfq.read",
  "rfq.write",
  "quotation.read",
  "quotation.write",
  "orders.read",
  "orders.write",
  "payments.read",
  "payments.write",
  "messages.read",
  "messages.write",
  "logistics.manage",
  "financing.apply",
  "disputes.manage",
  "reviews.write",
  "advertising.manage",
  "analytics.read",
] as const;
export type CompanyPermission = (typeof COMPANY_PERMISSIONS)[number];

export type MemberRole = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "PURCHASING" | "FINANCE" | "STAFF" | "VIEWER";

const ALL_COMPANY: CompanyPermission[] = [...COMPANY_PERMISSIONS];

export const MEMBER_ROLE_PERMISSIONS: Record<MemberRole, CompanyPermission[]> = {
  OWNER: ALL_COMPANY,
  ADMIN: ALL_COMPANY.filter((p) => p !== "company.billing.manage"),
  MANAGER: [
    "company.profile.read",
    "company.profile.write",
    "company.verification.submit",
    "products.read",
    "products.write",
    "products.publish",
    "rfq.read",
    "rfq.write",
    "quotation.read",
    "quotation.write",
    "orders.read",
    "orders.write",
    "payments.read",
    "messages.read",
    "messages.write",
    "logistics.manage",
    "disputes.manage",
    "reviews.write",
    "advertising.manage",
    "analytics.read",
  ],
  SALES: [
    "company.profile.read",
    "products.read",
    "products.write",
    "rfq.read",
    "quotation.read",
    "quotation.write",
    "orders.read",
    "messages.read",
    "messages.write",
    "analytics.read",
  ],
  PURCHASING: [
    "company.profile.read",
    "rfq.read",
    "rfq.write",
    "quotation.read",
    "orders.read",
    "orders.write",
    "messages.read",
    "messages.write",
    "logistics.manage",
    "reviews.write",
  ],
  FINANCE: [
    "company.profile.read",
    "orders.read",
    "payments.read",
    "payments.write",
    "financing.apply",
    "company.billing.manage",
    "analytics.read",
  ],
  STAFF: ["company.profile.read", "products.read", "rfq.read", "quotation.read", "orders.read", "messages.read", "messages.write"],
  VIEWER: ["company.profile.read", "products.read", "rfq.read", "quotation.read", "orders.read", "messages.read"],
};

export function platformCan(role: PlatformRole | string | null | undefined, permission: PlatformPermission): boolean {
  if (!role) return false;
  const perms = PLATFORM_ROLE_PERMISSIONS[role as PlatformRole];
  return perms ? perms.includes(permission) : false;
}

export function memberCan(role: MemberRole | string | null | undefined, permission: CompanyPermission): boolean {
  if (!role) return false;
  const perms = MEMBER_ROLE_PERMISSIONS[role as MemberRole];
  return perms ? perms.includes(permission) : false;
}

export const ADMIN_ROLES: PlatformRole[] = ["SUPPORT", "MODERATOR", "FINANCE", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"];
export const isStaff = (role: string | null | undefined) => ADMIN_ROLES.includes(role as PlatformRole);
