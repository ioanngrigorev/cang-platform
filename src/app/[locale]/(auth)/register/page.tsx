import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";
import { defaultHomeFor } from "@/modules/auth/redirects";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string; next?: string }> }) {
  const { type, next } = await searchParams;
  const auth = await getAuth();
  const locale = await getLocale();
  if (auth) redirect({ href: defaultHomeFor(auth.user.platformRole, auth.activeMembership?.company ?? null), locale });
  const t = await getTranslations("auth.register");
  const countryRows = await db.select({ code: countries.code, name: countries.name, nameVi: countries.nameVi }).from(countries).orderBy(countries.sortOrder, countries.name);
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-steel-500">{t("subtitle")}</p>
      <div className="mt-6">
        <RegisterForm
          defaultType={type === "seller" ? "SELLER" : "BUYER"}
          next={next}
          locale={locale}
          countries={countryRows.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        />
      </div>
    </div>
  );
}
