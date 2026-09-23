"use client";

import { Bell, Building2, ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logoutAction, switchCompanyAction } from "@/modules/auth/actions";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownItem } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type UserMenuProps = {
  user: { name: string; email: string; avatarUrl: string | null; platformRole: string };
  memberships: Array<{ companyId: string; role: string; company: { id: string; name: string; isSeller: boolean; isBuyer: boolean; logoUrl: string | null } }>;
  activeCompanyId: string | null;
  unread: number;
  dark?: boolean;
};

export function UserMenu({ user, memberships, activeCompanyId, unread, dark }: UserMenuProps) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const active = memberships.find((m) => m.companyId === activeCompanyId) ?? memberships[0] ?? null;
  const isStaff = user.platformRole !== "USER";
  const home = isStaff && !active ? "/admin" : active?.company.isSeller ? "/seller" : "/buyer";
  const notificationsHref = active?.company.isSeller ? "/seller/notifications" : "/buyer/notifications";
  return (
    <div className="flex items-center gap-2">
      <Link href={notificationsHref} className={cn("relative rounded-md p-2", dark ? "text-white/80 hover:bg-white/10" : "text-steel-600 hover:bg-steel-100")} aria-label={tc("labels.notifications")}>
        <Bell className="size-5" />
        {unread > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-on-brand">{unread > 99 ? "99+" : unread}</span> : null}
      </Link>
      <Dropdown
        trigger={
          <span className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", dark ? "text-white hover:bg-white/10" : "text-ink-900 hover:bg-steel-100")}>
            <Avatar name={user.name} src={user.avatarUrl} size={30} />
            <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">{active?.company.name ?? user.name}</span>
            <ChevronDown className="size-4 opacity-60" />
          </span>
        }
      >
        <div className="border-b border-steel-100 px-3 py-2">
          <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
          <p className="truncate text-xs text-steel-500">{user.email}</p>
        </div>
        <Link href={home} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-steel-100">
          <LayoutDashboard className="size-4 text-steel-500" /> {active?.company.isSeller ? t("sellerDashboard") : t("buyerDashboard")}
        </Link>
        {isStaff ? (
          <Link href="/admin" className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-steel-100">
            <ShieldCheck className="size-4 text-steel-500" /> {t("adminConsole")}
          </Link>
        ) : null}
        <Link href={active?.company.isSeller ? "/seller/settings" : "/buyer/settings"} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-steel-100">
          <Settings className="size-4 text-steel-500" /> {tc("labels.settings")}
        </Link>
        {memberships.length > 1 ? (
          <div className="border-t border-steel-100 pt-1">
            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-steel-400">{t("switchCompany")}</p>
            {memberships.map((m) => (
              <DropdownItem key={m.companyId} onClick={() => switchCompanyAction(m.companyId)} className={cn(m.companyId === active?.companyId && "bg-steel-50 font-medium")}>
                <Building2 /> <span className="truncate">{m.company.name}</span>
              </DropdownItem>
            ))}
          </div>
        ) : null}
        <div className="border-t border-steel-100 pt-1">
          <DropdownItem onClick={() => logoutAction()}>
            <LogOut /> {tc("actions.signOut")}
          </DropdownItem>
        </div>
      </Dropdown>
    </div>
  );
}
