import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your company", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ enable?: string }> }) {
  const { enable } = await searchParams;
  const auth = await getAuth();
  const locale = await getLocale();
  if (!auth) redirect({ href: "/login?next=/onboarding", locale });
  const t = await getTranslations("auth.onboarding");
  const countryRows = await db.select({ code: countries.code, name: countries.name, nameVi: countries.nameVi }).from(countries).orderBy(countries.sortOrder, countries.name);
  const active = auth!.activeMembership;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-6 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-lg rounded-lg border border-steel-200 bg-white p-6 shadow-card">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-steel-500">{t("subtitle")}</p>
        <div className="mt-6">
          <OnboardingForm
            countries={countryRows.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
            existing={active ? { id: active.companyId, name: active.company.name, isBuyer: active.company.isBuyer, isSeller: active.company.isSeller } : null}
            enable={enable === "BUYER" || enable === "SELLER" ? enable : null}
          />
        </div>
      </div>
    </div>
  );
}
