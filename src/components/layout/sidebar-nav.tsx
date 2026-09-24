"use client";

import {
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  Bookmark,
  Boxes,
  Building2,
  ClipboardCheck,
  CreditCard,
  Crown,
  Factory,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderTree,
  Gavel,
  Heart,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  Megaphone,
  MessageSquare,
  Newspaper,
  Package,
  PackageOpen,
  Percent,
  Plug,
  Receipt,
  Route,
  ScrollText,
  Settings,
  ShieldAlert,
  Star,
  Truck,
  Users,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

/** Only the icons the sidebars use — importing all of lucide into the client bundle costs ~1 MB. */
const Icons = { Award, BadgeCheck, BarChart3, Bell, Bookmark, Boxes, Building2, ClipboardCheck, CreditCard, Crown, Factory, FileSpreadsheet, FileText, FolderOpen, FolderTree, Gavel, Heart, KeyRound, Landmark, LayoutDashboard, LifeBuoy, MapPinned, Megaphone, MessageSquare, Newspaper, Package, PackageOpen, Percent, Plug, Receipt, Route, ScrollText, Settings, ShieldAlert, Star, Truck, Users } satisfies Record<string, LucideIcon>;

export type NavItem = { label: string; href: string; icon: keyof typeof Icons; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

function Icon({ name, className }: { name: keyof typeof Icons; className?: string }) {
  const Cmp = Icons[name];
  return Cmp ? <Cmp className={className} /> : null;
}

export function SidebarNav({ sections, header, company }: { sections: NavSection[]; header: React.ReactNode; company: { name: string; logoUrl: string | null; verificationStatus: string } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const isActive = (href: string) => {
    const root = href.split("/").filter(Boolean).length === 1; // e.g. /buyer
    return root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  };
  const content = (
    <div className="flex h-full flex-col">
      {header}
      {company ? (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-white/5 px-3 py-2">
          <Avatar name={company.name} src={company.logoUrl} size={28} square />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{company.name}</p>
            <p className={cn("text-[11px]", company.verificationStatus === "VERIFIED" ? "text-success-500" : "text-steel-400")}>{company.verificationStatus === "VERIFIED" ? "Verified" : "Not verified"}</p>
          </div>
        </div>
      ) : null}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {sections.map((s, i) => (
          <div key={i} className="mb-3">
            {s.title ? <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-steel-500">{s.title}</p> : null}
            {s.items.map((it) => {
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-brass-500/15 font-medium text-brass-300" : "text-steel-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon name={it.icon} className={cn("size-4 shrink-0", active ? "text-brass-400" : "text-steel-500")} />
                  <span className="truncate">{it.label}</span>
                  {it.badge ? <span className="ml-auto rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-on-brand">{it.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-ink-800 bg-ink-950 lg:block">{content}</aside>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 left-4 z-30 rounded-full bg-ink-900 p-3 text-white shadow-panel lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-ink-950 shadow-panel animate-fade-in">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-3 rounded-md p-2 text-steel-400 hover:bg-white/10" aria-label="Close navigation">
              <X className="size-5" />
            </button>
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
