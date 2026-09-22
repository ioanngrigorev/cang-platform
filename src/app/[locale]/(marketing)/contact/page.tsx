import { Building2, Clock, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { JsonLd, PageHeader } from "@/components/ui/misc";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { getAuth } from "@/modules/auth/current-user";
import { getRenderedPage } from "@/modules/content/queries";
import { pageMetadata } from "@/modules/content/seo";
import { ContactForm } from "./contact-form";

type Props = { params: Promise<{ locale: string }> };

const SUPPORT_EMAIL = "support@cang.vn";
const SUPPORT_PHONE = "+84 28 7300 1234";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, page] = await Promise.all([getTranslations({ locale, namespace: "content" }), getRenderedPage("contact", locale, "PAGE")]);
  return pageMetadata({
    locale,
    path: "/contact",
    title: page?.seoTitle ?? page?.title ?? t("contact.title"),
    description: page?.seoDescription ?? page?.excerpt ?? t("contact.metaDescription"),
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, page, auth] = await Promise.all([getTranslations("content"), getRenderedPage("contact", locale, "PAGE"), getAuth()]);
  const title = page?.title ?? t("contact.title");
  const crumbs = [{ label: t("common.home"), href: "/" }, { label: title }];

  return (
    <div className="container py-8">
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd(
            [
              { name: t("common.home"), path: "/" },
              { name: title, path: "/contact" },
            ],
            locale,
          ),
        ]}
      />
      <PageHeader title={title} description={page?.excerpt ?? t("contact.subtitle")} breadcrumbs={crumbs} eyebrow={t("contact.eyebrow")} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Card>
            <CardHeader title={t("contact.formTitle")} />
            <CardContent>
              {auth ? (
                <ContactForm userName={auth.user.name} />
              ) : (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold">{t("contact.anonymousTitle")}</h3>
                  <p className="text-sm text-steel-600">{t("contact.anonymousBody")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button href="/register?next=/contact">{t("contact.register")}</Button>
                    <Button href="/login?next=/contact" variant="secondary">
                      {t("contact.signIn")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {page?.html ? (
            <article className="prose-cang mt-8 max-w-3xl" dangerouslySetInnerHTML={{ __html: page.html }} />
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title={t("contact.channels")} />
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("contact.email")}</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ink-900 hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("contact.phone")}</p>
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="font-medium text-ink-900 hover:underline">
                    {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-steel-500">{t("contact.hours")}</p>
                  <p className="font-medium text-ink-900">{t("contact.hoursValue")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("contact.offices")} />
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="font-medium text-ink-900">{t("contact.hcmc")}</p>
                  <p className="text-steel-600">{t("contact.hcmcAddress")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-steel-400" />
                <div>
                  <p className="font-medium text-ink-900">{t("contact.hanoi")}</p>
                  <p className="text-steel-600">{t("contact.hanoiAddress")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-ink-900">{t("contact.supplierOnboarding")}</p>
              <p className="mt-1 text-sm text-steel-600">{t("contact.supplierOnboardingBody")}</p>
              <Button href="/register?type=seller" variant="secondary" size="sm" className="mt-3 w-full">
                {t("common.becomeSupplier")}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
