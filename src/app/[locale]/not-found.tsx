import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <p className="font-display text-7xl font-bold text-ink-100">404</p>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-steel-600">{t("description")}</p>
      <Button href="/">{t("home")}</Button>
    </div>
  );
}
