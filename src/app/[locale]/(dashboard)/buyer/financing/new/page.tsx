import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinancingForm } from "@/components/buyer/financing-form";
import { PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { buyerOrderOptions } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Apply for financing", robots: { index: false } };

export default async function NewFinancingPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "financing.apply", buyer: true });
  const t = await getTranslations("financing.form");

  const orders = await buyerOrderOptions(company.id, ["PURCHASE_ORDER", "PAYMENT", "PRODUCTION", "QUALITY_INSPECTION", "SHIPPING", "DELIVERY"]);
  const selected = sp.order ? orders.find((o) => o.id === sp.order) : null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: "Financing", href: "/buyer/financing" },
          { label: t("title") },
        ]}
      />
      <FinancingForm
        orders={orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, supplierName: o.supplierName, total: o.total, currency: o.currency }))}
        defaults={{ orderId: selected?.id ?? null, amount: selected?.total ?? null, currency: selected?.currency ?? "USD" }}
      />
    </>
  );
}
