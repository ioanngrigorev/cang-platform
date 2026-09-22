import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { productCardLabels, supplierCardLabels } from "./labels";
import { ProductCard, type ProductCardData } from "./product-card";
import { SupplierCard, type SupplierCardData } from "./supplier-card";

const PRODUCT_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
} as const;

/** Server-rendered ProductCard grid with translated labels. */
export async function ProductGrid({ products, columns = 4, compact, className }: { products: ProductCardData[]; columns?: keyof typeof PRODUCT_COLS; compact?: boolean; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const labels = productCardLabels(t);
  return (
    <div className={cn("grid gap-4", PRODUCT_COLS[columns], className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} locale={locale} labels={labels} compact={compact} />
      ))}
    </div>
  );
}

const SUPPLIER_COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
} as const;

export async function SupplierGrid({ suppliers, columns = 4, variant = "grid", className }: { suppliers: SupplierCardData[]; columns?: keyof typeof SUPPLIER_COLS; variant?: "grid" | "row"; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const labels = supplierCardLabels(t);
  return (
    <div className={cn("grid gap-4", SUPPLIER_COLS[columns], className)}>
      {suppliers.map((s) => (
        <SupplierCard key={s.id} supplier={s} locale={locale} labels={labels} variant={variant} />
      ))}
    </div>
  );
}
