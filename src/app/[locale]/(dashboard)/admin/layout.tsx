import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ClientMessages, DASHBOARD_NAMESPACES } from "@/i18n/client-messages";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";
import { platformCan } from "@/modules/auth/rbac";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  const locale = await getLocale();
  if (!auth) redirect({ href: "/login?next=/admin", locale });
  if (!platformCan(auth!.user.platformRole, "admin.access")) redirect({ href: "/", locale });
  return (
    <ClientMessages namespaces={DASHBOARD_NAMESPACES.admin}>
    <DashboardShell role="admin" auth={auth!}>
      {children}
    </DashboardShell>
    </ClientMessages>
  );
}
