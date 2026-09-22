import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentArticle } from "@/components/marketplace/content-article";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

const QUICK_LINKS: Array<{ key: string; href: string }> = [
  { key: "buyerGuide", href: "/guides/buyer-guide" },
  { key: "supplierGuide", href: "/guides/supplier-guide" },
  { key: "tradeAssurance", href: "/trade-assurance" },
  { key: "pricing", href: "/pricing" },
  { key: "terms", href: "/legal/terms" },
  { key: "privacy", href: "/legal/privacy" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "content" }), getRenderedPage("help", locale, "PAGE")]);
  return pageMetadata({
    locale,
    path: "/help",
    title: page?.seoTitle ?? page?.title ?? t("help.title"),
    description: page?.seoDescription ?? page?.excerpt ?? t("help.metaDescription"),
  });
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, page] = await Promise.all([getTranslations("content"), getRenderedPage("help", locale, "PAGE")]);
  const title = page?.title ?? t("help.title");

  return (
    <ContentArticle
      eyebrow={t("help.eyebrow")}
      title={title}
      excerpt={page?.excerpt ?? t("help.metaDescription")}
      html={page?.html ?? ""}
      toc={page?.toc}
      tocTitle={t("common.onThisPage")}
      breadcrumbs={[{ label: t("common.home"), href: "/" }, { label: title }]}
      before={
        <JsonLd
          data={breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: title, path: "/help" },
            ],
            locale,
          )}
        />
      }
      aside={
        <>
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel-500">{t("help.quickLinks")}</p>
              <ul className="space-y-2 text-sm">
                {QUICK_LINKS.map((l) => (
                  <li key={l.key}>
                    <Link href={l.href} className="font-medium text-ink-800 hover:text-ink-950 hover:underline">
                      {t(`help.links.${l.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <LifeBuoy className="size-4 text-brass-600" /> {t("help.stillNeedHelp")}
              </p>
              <p className="mt-1 text-sm text-steel-600">{t("help.stillNeedHelpBody")}</p>
              <Button href="/contact" size="sm" className="mt-3 w-full">
                {t("help.contact")}
              </Button>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
