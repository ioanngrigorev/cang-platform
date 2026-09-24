import { CheckCircle2, ClipboardList, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IconCard, Step } from "@/components/marketplace/section";
import { SupplierCta } from "@/components/marketplace/supplier-cta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { Link, redirect } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { getAuth } from "@/modules/auth/current-user";
import { pageMetadata } from "@/modules/content/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketplace" });
  return pageMetadata({
    locale,
    path: "/rfq/new",
    title: t("rfq.new.title"),
    description: t("rfq.new.metaDescription"),
  });
}

export default async function NewRfqLandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const auth = await getAuth();
  // Signed-in users go straight to the real form in the buyer dashboard.
  if (auth) redirect({ href: "/buyer/rfqs/new", locale });

  const t = await getTranslations("marketplace");
  const path = "/rfq/new";
  const crumbs = [
    { label: t("breadcrumbs.home"), href: "/" },
    { label: t("breadcrumbs.rfq"), href: "/rfq" },
    { label: t("rfq.new.title") },
  ];
  const benefits = [
    { icon: <Users />, title: t("rfq.new.benefit1Title"), body: t("rfq.new.benefit1Body") },
    { icon: <ClipboardList />, title: t("rfq.new.benefit2Title"), body: t("rfq.new.benefit2Body") },
    { icon: <ShieldCheck />, title: t("rfq.new.benefit3Title"), body: t("rfq.new.benefit3Body") },
  ];
  const include = [t("rfq.new.include1"), t("rfq.new.include2"), t("rfq.new.include3"), t("rfq.new.include4")];

  return (
    <div className="container py-8">
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t("breadcrumbs.home"), path: "/" },
            { name: t("breadcrumbs.rfq"), path: "/rfq" },
            { name: t("rfq.new.title"), path },
          ],
          locale,
        )}
      />
      <PageHeader
        title={t("rfq.new.title")}
        description={t("rfq.new.subtitle")}
        breadcrumbs={crumbs}
        eyebrow={t("rfq.forBuyers")}
        actions={
          <>
            <Button href="/register?next=/buyer/rfqs/new">{t("rfq.new.cta")}</Button>
            <Button href="/login?next=/buyer/rfqs/new" variant="secondary">
              {t("rfq.new.signIn")}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        {benefits.map((b) => (
          <IconCard key={b.title} icon={b.icon} title={b.title} body={b.body} />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-steel-200 bg-steel-50/60 p-6">
          <h2 className="mb-5 text-lg font-semibold">{t("rfq.howToQuote")}</h2>
          <div className="space-y-5">
            <Step index={1} title={t("rfq.new.cta")} body={t("rfq.new.benefit1Body")} />
            <Step index={2} title={t("rfq.new.whatToInclude")} body={include.join(" · ")} />
            <Step index={3} title={t("rfq.quoteStep3")} body={t("rfq.new.benefit3Body")} />
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-base font-semibold">{t("rfq.new.whatToInclude")}</h2>
              <ul className="mt-3 space-y-2 text-sm text-steel-700">
                {include.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-600" />
                    {i}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-steel-600">{t("rfq.forSuppliersBody")}</p>
              <SupplierCta label={t("rfq.submitQuotation")} sellerHref="/seller/rfqs" variant="secondary" size="sm" className="mt-3 w-full" />
            </CardContent>
          </Card>
          <p className="text-sm">
            <Link href="/rfq" className="font-medium text-ink-700 hover:underline">
              ← {t("rfq.backToRfqs")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
