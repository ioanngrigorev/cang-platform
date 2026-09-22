import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "@/modules/auth/current-user";
import { googleEnabled } from "@/modules/auth/google";
import { defaultHomeFor } from "@/modules/auth/redirects";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const auth = await getAuth();
  const locale = await getLocale();
  if (auth) redirect({ href: next && next.startsWith("/") ? next : defaultHomeFor(auth.user.platformRole, auth.activeMembership?.company ?? null), locale });
  const t = await getTranslations("auth.login");
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-steel-500">{t("subtitle")}</p>
      <div className="mt-6">
        <LoginForm next={next} googleEnabled={googleEnabled()} oauthError={error} locale={locale} />
      </div>
    </div>
  );
}
