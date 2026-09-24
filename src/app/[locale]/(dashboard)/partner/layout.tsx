import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ClientMessages, DASHBOARD_NAMESPACES } from "@/i18n/client-messages";
import { redirect } from "@/i18n/navigation";
import { loginHrefForCurrentPath } from "@/lib/request-path";
import { getAuth } from "@/modules/auth/current-user";
import { companyHome } from "@/modules/auth/redirects";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  const locale = await getLocale();
  if (!auth) redirect({ href: await loginHrefForCurrentPath("/partner"), locale });
  const m = auth!.activeMembership;
  if (!m) redirect({ href: "/onboarding", locale });
  // Only logistics-partner companies have a portal; send everyone else to their own dashboard.
  if (!m!.company.isLogisticsPartner) redirect({ href: companyHome(m!.company), locale });
  return (
    <ClientMessages namespaces={DASHBOARD_NAMESPACES.partner}>
      <DashboardShell role="partner" auth={auth!}>
        {children}
      </DashboardShell>
    </ClientMessages>
  );
}
