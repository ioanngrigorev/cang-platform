import { getTranslations } from "next-intl/server";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import type { AuthContext } from "@/modules/auth/current-user";
import { unreadConversationCount } from "@/modules/messaging/queries";
import { unreadCount } from "@/modules/notifications/service";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { SidebarNav, type NavItem, type NavSection } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

export type DashboardRole = "buyer" | "seller" | "admin";

/** Sidebar navigation per dashboard. Keys map to nav.sidebar.* translations. */
export function navFor(role: DashboardRole, t: (k: string) => string): NavSection[] {
  const s = (key: string, href: string, icon: NavItem["icon"]): NavItem => ({ label: t(`sidebar.${key}`), href, icon });
  if (role === "buyer") {
    return [
      { items: [s("overview", "/buyer", "LayoutDashboard")] },
      {
        title: "Sourcing",
        items: [s("myRfqs", "/buyer/rfqs", "FileText"), s("quotations", "/buyer/quotations", "Receipt"), s("messages", "/buyer/messages", "MessageSquare"), s("savedSuppliers", "/buyer/saved/suppliers", "Bookmark"), s("savedProducts", "/buyer/saved/products", "Heart")],
      },
      {
        title: "Transactions",
        items: [s("orders", "/buyer/orders", "Package"), s("payments", "/buyer/payments", "CreditCard"), s("invoices", "/buyer/invoices", "FileSpreadsheet"), s("shipments", "/buyer/shipments", "Truck"), s("inspection", "/buyer/inspections", "ClipboardCheck"), s("financing", "/buyer/financing", "Landmark"), s("disputes", "/buyer/disputes", "ShieldAlert"), s("reviews", "/buyer/reviews", "Star")],
      },
      {
        title: "Company",
        items: [s("companyProfile", "/buyer/company", "Building2"), s("verification", "/buyer/company/verification", "BadgeCheck"), s("documents", "/buyer/documents", "FolderOpen"), s("team", "/buyer/team", "Users"), s("notifications", "/buyer/notifications", "Bell"), s("settings", "/buyer/settings", "Settings")],
      },
    ];
  }
  if (role === "seller") {
    return [
      { items: [s("overview", "/seller", "LayoutDashboard")] },
      {
        title: "Catalog",
        items: [s("products", "/seller/products", "Boxes"), s("companyProfile", "/seller/company", "Building2"), s("factoryProfile", "/seller/company/factory", "Factory"), s("certifications", "/seller/company/certifications", "Award"), s("verification", "/seller/company/verification", "BadgeCheck")],
      },
      {
        title: "Sales",
        items: [s("rfqMarketplace", "/seller/rfqs", "FileText"), s("quotations", "/seller/quotations", "Receipt"), s("messages", "/seller/messages", "MessageSquare"), s("orders", "/seller/orders", "Package"), s("payments", "/seller/payments", "CreditCard"), s("invoices", "/seller/invoices", "FileSpreadsheet"), s("shipments", "/seller/shipments", "Truck"), s("financing", "/seller/financing", "Landmark"), s("disputes", "/seller/disputes", "ShieldAlert"), s("reviews", "/seller/reviews", "Star")],
      },
      {
        title: "Growth",
        items: [s("analytics", "/seller/analytics", "BarChart3"), s("advertising", "/seller/advertising", "Megaphone"), s("subscription", "/seller/subscription", "Crown")],
      },
      {
        title: "Company",
        items: [s("team", "/seller/team", "Users"), s("apiAccess", "/seller/api", "KeyRound"), s("documents", "/seller/documents", "FolderOpen"), s("notifications", "/seller/notifications", "Bell"), s("settings", "/seller/settings", "Settings")],
      },
    ];
  }
  return [
    { items: [s("overview", "/admin", "LayoutDashboard")] },
    {
      title: "Marketplace",
      items: [s("users", "/admin/users", "Users"), s("companies", "/admin/companies", "Building2"), s("kyb", "/admin/verification", "BadgeCheck"), s("products", "/admin/products", "Boxes"), s("categories", "/admin/categories", "FolderTree"), s("rfqs", "/admin/rfqs", "FileText"), s("moderation", "/admin/moderation", "Gavel")],
    },
    {
      title: "Transactions",
      items: [s("orders", "/admin/orders", "Package"), s("payments", "/admin/payments", "CreditCard"), s("lending", "/admin/financing", "Landmark"), s("logistics", "/admin/logistics", "Truck"), s("disputes", "/admin/disputes", "ShieldAlert"), s("fraud", "/admin/risk", "ShieldAlert")],
    },
    {
      title: "Monetization",
      items: [s("commissions", "/admin/fees", "Percent"), s("subscriptions", "/admin/plans", "Crown"), s("advertising", "/admin/advertising", "Megaphone"), s("providers", "/admin/providers", "Plug")],
    },
    {
      title: "Platform",
      items: [s("analytics", "/admin/analytics", "BarChart3"), s("cms", "/admin/cms", "Newspaper"), s("support", "/admin/support", "LifeBuoy"), s("systemSettings", "/admin/settings", "Settings"), s("auditLogs", "/admin/audit", "ScrollText")],
    },
  ];
}

export async function DashboardShell({ role, auth, children, title }: { role: DashboardRole; auth: AuthContext; children: React.ReactNode; title?: string }) {
  const t = await getTranslations("nav");
  const sections = navFor(role, t);
  const company = auth.activeMembership?.company ?? null;
  const [unread, unreadThreads] = await Promise.all([
    unreadCount(auth.user.id),
    role !== "admin" && company ? unreadConversationCount(company.id, auth.user.id).catch(() => 0) : Promise.resolve(0),
  ]);
  for (const section of sections) {
    for (const item of section.items) {
      if (item.href.endsWith("/messages") && unreadThreads > 0) item.badge = unreadThreads;
      if (item.href.endsWith("/notifications") && unread > 0) item.badge = unread;
    }
  }
  const roleLabel = { buyer: t("buyerDashboard"), seller: t("sellerDashboard"), admin: t("adminConsole") }[role];

  return (
    <div className="flex min-h-screen bg-steel-50">
      <SidebarNav sections={sections} header={<div className="px-4 py-4"><Logo dark /><p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-steel-400">{title ?? roleLabel}</p></div>} company={company ? { name: company.name, logoUrl: company.logoUrl, verificationStatus: company.verificationStatus } : null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-steel-200 bg-white px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <nav className="hidden text-sm text-steel-500 lg:block">
            <Link href="/" className="hover:text-ink-900">
              cang.vn
            </Link>
            <span className="mx-2 text-steel-300">/</span>
            <span className="font-medium text-ink-900">{title ?? roleLabel}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <UserMenu
              user={{ name: auth.user.name, email: auth.user.email, avatarUrl: auth.user.avatarUrl, platformRole: auth.user.platformRole }}
              memberships={auth.memberships.map((m) => ({ companyId: m.companyId, role: m.role, company: { id: m.company.id, name: m.company.name, isSeller: m.company.isSeller, isBuyer: m.company.isBuyer, logoUrl: m.company.logoUrl } }))}
              activeCompanyId={auth.activeMembership?.companyId ?? null}
              unread={unread}
            />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
