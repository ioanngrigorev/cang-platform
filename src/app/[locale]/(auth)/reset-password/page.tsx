import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = await getTranslations("auth.reset");
  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <ResetForm token={token ?? ""} />
      </div>
    </div>
  );
}
