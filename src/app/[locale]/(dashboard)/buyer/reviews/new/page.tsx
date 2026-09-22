import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReviewForm } from "@/components/buyer/review-form";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { ordersPendingReview } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Write a review", robots: { index: false } };

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "reviews.write", buyer: true });
  const t = await getTranslations("buyer.reviews");

  const pending = await ordersPendingReview(company.id);

  return (
    <>
      <PageHeader
        title={t("newTitle")}
        description={t("newDescription")}
        breadcrumbs={[
          { label: t("title"), href: "/buyer/reviews" },
          { label: t("writeReview") },
        ]}
      />
      {pending.length === 0 ? (
        <EmptyState icon={<Star />} title={t("noOrders")} action={<Button href="/buyer/orders" variant="primary">{t("order")}</Button>} />
      ) : (
        <ReviewForm orders={pending.map((o) => ({ id: o.id, orderNumber: o.orderNumber, supplierName: o.supplier.name }))} defaultOrderId={sp.order} />
      )}
    </>
  );
}
