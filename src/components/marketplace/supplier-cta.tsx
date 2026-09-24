import { getTranslations } from "next-intl/server";
import { Button, type ButtonProps } from "@/components/ui/button";
import { becomeSupplierHref } from "@/lib/cta";
import { getAuth } from "@/modules/auth/current-user";

/**
 * "Become a supplier" / "Submit a quotation" button that adapts to the visitor: sign-up for guests,
 * supplier onboarding for signed-in buyers, and the supplier dashboard (or `sellerHref`) for suppliers.
 */
export async function SupplierCta({
  label,
  sellerHref = "/seller",
  sellerLabel,
  variant,
  size,
  className,
}: {
  label?: string;
  sellerHref?: string;
  sellerLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [auth, t] = await Promise.all([getAuth(), getTranslations("nav")]);
  const href = becomeSupplierHref(auth);
  return (
    <Button href={href ?? sellerHref} variant={variant} size={size} className={className}>
      {href ? (label ?? t("becomeSupplier")) : (sellerLabel ?? label ?? t("sellerDashboard"))}
    </Button>
  );
}
