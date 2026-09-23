import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { cookies } from "next/headers";
import { ThemeSwitcher } from "./theme-switcher";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("common.footer");
  const cols: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: t("forBuyers"),
      links: [
        { label: t("buyerGuide"), href: "/guides/buyer-guide" },
        { label: t("postRfq"), href: "/rfq/new" },
        { label: t("tradeAssurance"), href: "/trade-assurance" },
        { label: t("inspection"), href: "/inspection" },
        { label: t("logistics"), href: "/logistics" },
        { label: t("financing"), href: "/financing" },
      ],
    },
    {
      title: t("forSuppliers"),
      links: [
        { label: t("supplierGuide"), href: "/guides/supplier-guide" },
        { label: t("becomeSupplier"), href: "/register?type=seller" },
        { label: t("pricing"), href: "/pricing" },
        { label: "RFQ Marketplace", href: "/rfq" },
      ],
    },
    {
      title: t("platform"),
      links: [
        { label: t("whyVietnam"), href: "/why-vietnam" },
        { label: t("clusters"), href: "/clusters" },
        { label: "Manufacturers", href: "/manufacturers" },
        { label: "Products", href: "/products" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "/about" },
        { label: t("contact"), href: "/contact" },
        { label: t("help"), href: "/help" },
        { label: t("terms"), href: "/legal/terms" },
        { label: t("privacy"), href: "/legal/privacy" },
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t border-steel-200 bg-ink-950 text-steel-300">
      <div className="container grid gap-10 py-12 md:grid-cols-6">
        <div className="md:col-span-2">
          <Logo dark />
          <p className="mt-3 max-w-sm text-sm text-steel-400">{t("disclaimer")}</p>
          <div className="mt-4">
            <LocaleSwitcher dark />
          </div>
          <div className="mt-4">
            <ThemeSwitcher />
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/90">{c.title}</h4>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-steel-400 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-4 text-xs text-steel-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>cang.vn · Ho Chi Minh City · Hanoi</p>
        </div>
      </div>
    </footer>
  );
}
