import { Menu } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getAuth } from "@/modules/auth/current-user";
import { unreadCount } from "@/modules/notifications/service";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";

export const NAV_LINKS = [
  { key: "products", href: "/products" },
  { key: "manufacturers", href: "/manufacturers" },
  { key: "rfq", href: "/rfq" },
  { key: "clusters", href: "/clusters" },
  { key: "tradeAssurance", href: "/trade-assurance" },
  { key: "logistics", href: "/logistics" },
  { key: "financing", href: "/financing" },
] as const;

/** Public site header (server component). Shows sign-in CTAs or the user menu. */
export async function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");
  const auth = await getAuth();
  const unread = auth ? await unreadCount(auth.user.id) : 0;
  const links = NAV_LINKS.map((l) => ({ ...l, label: t(l.key) }));

  return (
    <header className="sticky top-0 z-30 border-b border-steel-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-16 items-center gap-4">
        <MobileNav links={links} trigger={<span className="inline-flex rounded-md p-2 text-steel-600 hover:bg-steel-100 lg:hidden" aria-label={t("menu")}><Menu className="size-5" /></span>} />
        <Logo />
        {showSearch ? (
          <div className="hidden flex-1 md:block md:max-w-xl">
            <SearchBar />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          {auth ? (
            <UserMenu
              user={{ name: auth.user.name, email: auth.user.email, avatarUrl: auth.user.avatarUrl, platformRole: auth.user.platformRole }}
              memberships={auth.memberships.map((m) => ({ companyId: m.companyId, role: m.role, company: { id: m.company.id, name: m.company.name, isSeller: m.company.isSeller, isBuyer: m.company.isBuyer, logoUrl: m.company.logoUrl } }))}
              activeCompanyId={auth.activeMembership?.companyId ?? null}
              unread={unread}
            />
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {tc("actions.signIn")}
              </Button>
              <Button href="/register" variant="primary" size="sm">
                {tc("actions.register")}
              </Button>
            </>
          )}
        </div>
      </div>
      <nav className="hidden border-t border-steel-100 lg:block" aria-label="Primary">
        <div className="container flex h-10 items-center gap-6 text-sm">
          {links.map((l) => (
            <Link key={l.key} href={l.href} className="font-medium text-steel-700 hover:text-ink-900">
              {l.label}
            </Link>
          ))}
          <Link href="/register?type=seller" className="ml-auto font-semibold text-jade-600 hover:text-jade-700">
            {t("becomeSupplier")} →
          </Link>
        </div>
      </nav>
      {showSearch ? (
        <div className="container pb-3 md:hidden">
          <SearchBar showTypeToggle={false} />
        </div>
      ) : null}
    </header>
  );
}
