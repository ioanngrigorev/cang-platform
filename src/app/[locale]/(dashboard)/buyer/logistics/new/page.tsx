import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogisticsForm } from "@/components/buyer/logistics-form";
import { PageHeader } from "@/components/ui";
import { requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll, getBuyerCompanyProfile } from "@/modules/company-profile/buyer-queries";
import { buyerOrderOptions, getBuyerOrder } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "New freight request", robots: { index: false } };

export default async function NewLogisticsRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { company } = await requireCompany({ permission: "logistics.manage", buyer: true });
  const t = await getTranslations("logistics.form");

  const [countries, orders, profile, order] = await Promise.all([
    countryOptionsAll(),
    buyerOrderOptions(company.id, ["PURCHASE_ORDER", "PAYMENT", "PRODUCTION", "QUALITY_INSPECTION", "SHIPPING"]),
    getBuyerCompanyProfile(company.id),
    sp.order ? getBuyerOrder(company.id, sp.order) : Promise.resolve(null),
  ]);

  const shipTo = order?.shippingAddress ?? null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: "Logistics", href: "/buyer/logistics" },
          { label: t("title") },
        ]}
      />
      <LogisticsForm
        countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
        orders={orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, supplierName: o.supplierName }))}
        defaults={{
          orderId: order?.id ?? null,
          originCountryCode: "VN",
          originCity: order?.supplierCompany?.city ?? "",
          destinationCompany: shipTo?.company ?? profile?.name ?? "",
          destinationLine1: shipTo?.line1 ?? profile?.address ?? "",
          destinationCity: shipTo?.city ?? profile?.city ?? "",
          destinationPostalCode: shipTo?.postalCode ?? profile?.postalCode ?? "",
          destinationCountryCode: shipTo?.countryCode ?? profile?.countryCode ?? "",
          incoterm: order?.incoterm ?? null,
          cargoDescription: order ? order.items.map((i) => `${i.quantity} ${i.unit} ${i.description}`).join("; ").slice(0, 1000) : "",
          cargoValue: order?.total ?? null,
          currency: order?.currency ?? profile?.buyerProfile?.preferredCurrency ?? "USD",
        }}
      />
    </>
  );
}
