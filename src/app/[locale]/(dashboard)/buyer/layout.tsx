import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";

export default async function BuyerLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  const locale = await getLocale();
  if (!auth) redirect({ href: "/login?next=/buyer", locale });
  if (!auth!.activeMembership) redirect({ href: "/onboarding", locale });
  if (!auth!.activeMembership!.company.isBuyer) redirect({ href: "/onboarding?enable=BUYER", locale });
  return (
    <DashboardShell role="buyer" auth={auth!}>
      {children}
    </DashboardShell>
  );
}
