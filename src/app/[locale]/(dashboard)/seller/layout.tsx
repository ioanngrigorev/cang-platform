import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ClientMessages, DASHBOARD_NAMESPACES } from "@/i18n/client-messages";
import { redirect } from "@/i18n/navigation";
import { currentPath, loginHrefForCurrentPath } from "@/lib/request-path";
import { getAuth } from "@/modules/auth/current-user";

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  const locale = await getLocale();
  if (!auth) redirect({ href: await loginHrefForCurrentPath("/seller"), locale });
  if (!auth!.activeMembership) redirect({ href: `/onboarding?type=SELLER&next=${encodeURIComponent(await currentPath("/seller"))}`, locale });
  if (!auth!.activeMembership!.company.isSeller) redirect({ href: `/onboarding?enable=SELLER&next=${encodeURIComponent(await currentPath("/seller"))}`, locale });
  return (
    <ClientMessages namespaces={DASHBOARD_NAMESPACES.seller}>
    <DashboardShell role="seller" auth={auth!}>
      {children}
    </DashboardShell>
    </ClientMessages>
  );
}
