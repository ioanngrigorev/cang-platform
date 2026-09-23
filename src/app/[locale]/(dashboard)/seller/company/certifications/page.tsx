import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AddCertificationButton, CertificationsTable } from "@/components/seller/certifications-manager";
import { Alert, PageHeader } from "@/components/ui";
import { canCompany, getAuth, requireCompany } from "@/modules/auth/current-user";
import { getCertifications } from "@/modules/catalog/queries";
import { listSellerCertifications } from "@/modules/seller/company/queries";

export const metadata: Metadata = { title: "Certifications", robots: { index: false } };

export default async function SellerCertificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "company.profile.read", seller: true });
  const auth = await getAuth();
  const canWrite = canCompany(auth, "company.profile.write");
  const t = await getTranslations("seller.certifications");
  const [rows, options] = await Promise.all([listSellerCertifications(company.id), getCertifications()]);
  const held = new Set(rows.map((r) => r.certificationId));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("companyCrumb"), href: "/seller/company" },
          { label: t("title") },
        ]}
        actions={canWrite ? <AddCertificationButton options={options.filter((o) => !held.has(o.id)).map((o) => ({ id: o.id, name: o.name }))} /> : undefined}
      />
      <Alert variant="info" className="mb-5">
        {t("reviewNote")}
      </Alert>
      <CertificationsTable
        locale={locale}
        canWrite={canWrite}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.certification.name,
          code: r.certification.code,
          issuingBody: r.certification.issuingBody,
          certificateNumber: r.certificateNumber,
          issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
          expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
          status: r.status,
          document: r.document && !r.document.deletedAt ? { name: r.document.name, url: r.document.url } : null,
        }))}
      />
    </>
  );
}
