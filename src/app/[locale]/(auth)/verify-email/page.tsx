import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/modules/auth/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return { title: t("title"), robots: { index: false } };
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = await getTranslations("auth.verifyEmail");
  const result = token ? await verifyEmailAction(token) : null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {result?.ok ? <Alert variant="success">{t("success")}</Alert> : <Alert variant="danger">{t("invalid")}</Alert>}
      <Button href="/login">Continue</Button>
    </div>
  );
}
