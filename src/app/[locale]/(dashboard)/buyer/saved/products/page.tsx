import { FileText, Heart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SaveButton } from "@/components/buyer/save-button";
import { Button, Card, CardContent, EmptyState, PageHeader, SmartImage } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatNumber, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listSavedProducts } from "@/modules/saved/queries";

export const metadata: Metadata = { title: "Saved products", robots: { index: false } };

export default async function SavedProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user } = await requireCompany({ buyer: true });
  const t = await getTranslations("buyer.saved");

  const rows = await listSavedProducts(user.id);

  return (
    <>
      <PageHeader title={t("productsTitle")} description={t("productsDescription")} actions={<Button href="/products" variant="secondary">{t("browseProducts")}</Button>} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title={t("emptyProducts")}
          description={t("emptyProductsHint")}
          action={
            <Button href="/products" variant="primary">
              {t("browseProducts")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
          {rows.map((row) => {
            const p = row.product!;
            return (
              <Card key={row.id} hover className="overflow-hidden">
                <Link href={`/product/${p.slug}`} className="block">
                  <div className="relative aspect-[4/3] bg-steel-50">
                    <SmartImage src={p.images[0]?.url} alt={p.title} fill photo fallbackLabel={p.title} />
                  </div>
                </Link>
                <CardContent className="space-y-2 py-3">
                  <Link href={`/product/${p.slug}`} className="line-clamp-2 text-sm font-medium text-ink-900 hover:underline">
                    {localized(p, "title", locale)}
                  </Link>
                  <p className="truncate text-xs text-steel-500">{p.company.name}</p>
                  <p className="text-sm font-semibold text-ink-900">
                    {p.basePrice ? formatMoney(p.basePrice, p.currency, locale) : "—"}
                    <span className="ml-1 text-xs font-normal text-steel-500">/ {p.unit}</span>
                  </p>
                  <p className="text-xs text-steel-500">{t("moq", { value: formatNumber(p.moq, locale), unit: p.unit })}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button href={`/buyer/rfqs/new?product=${p.id}`} variant="secondary" size="xs">
                      <FileText /> {t("requestQuote")}
                    </Button>
                    <SaveButton kind="product" id={p.id} saved labelSave={t("save")} labelSaved={t("saved")} size="xs" variant="ghost" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
