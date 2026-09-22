import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { KybForm } from "@/components/buyer/kyb-form";
import { Alert, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { countryOptionsAll, getKybState } from "@/modules/company-profile/buyer-queries";

export const metadata: Metadata = { title: "Verification & KYB", robots: { index: false } };

export default async function BuyerVerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { company } = await requireCompany({ permission: "company.verification.submit", buyer: true });
  const t = await getTranslations("buyer.verification");

  const [{ submissions, owners, documents }, countries] = await Promise.all([getKybState(company.id), countryOptionsAll()]);
  const latest = submissions[0] ?? null;
  const status = company.kybStatus;
  const canSubmit = status !== "PENDING" && status !== "IN_REVIEW" && status !== "VERIFIED";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: "Company", href: "/buyer/company" },
          { label: t("title") },
        ]}
      />

      <Card className="mb-6">
        <CardHeader title={t("statusTitle")} />
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("title")}</p>
              <StatusBadge status={status} className="mt-1" />
            </div>
            {latest ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("submittedAt")}</p>
                <p className="mt-1 text-sm text-ink-900">{formatDateTime(latest.submittedAt, locale)}</p>
              </div>
            ) : null}
            {latest?.reviewedAt ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("reviewedAt")}</p>
                <p className="mt-1 text-sm text-ink-900">{formatDateTime(latest.reviewedAt, locale)}</p>
              </div>
            ) : null}
          </div>
          {status === "PENDING" || status === "IN_REVIEW" ? <Alert variant="info">{t("pending")}</Alert> : null}
          {status === "VERIFIED" ? <Alert variant="success">{t("verified")}</Alert> : null}
          {status === "REJECTED" ? (
            <Alert variant="danger" title={t("rejected")}>
              {latest?.rejectionReason ?? latest?.notes ?? ""}
            </Alert>
          ) : null}
          <Alert variant="info" title={t("why")}>
            {t("whyBody")}
          </Alert>
        </CardContent>
      </Card>

      {canSubmit ? (
        <KybForm
          countries={countries.map((c) => ({ code: c.code, name: locale === "vi" ? c.nameVi : c.name }))}
          defaults={{
            legalName: company.legalName ?? company.name,
            registrationNumber: company.registrationNumber ?? "",
            taxId: company.taxId ?? "",
            registeredAddress: company.address ?? "",
            countryCode: company.countryCode,
            representativeName: "",
          }}
          owners={owners.map((o) => ({
            fullName: o.fullName,
            nationality: o.nationality ?? "",
            ownershipPercent: o.ownershipPercent != null ? String(o.ownershipPercent) : "",
            role: o.role ?? "",
            isPep: o.isPep,
          }))}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <Card>
            <CardHeader title={t("owners")} />
            <CardContent className="p-0">
              {owners.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">—</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("ownerName")}</TH>
                      <TH>{t("ownerNationality")}</TH>
                      <TH>{t("ownerPercent")}</TH>
                      <TH>{t("ownerRole")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {owners.map((o) => (
                      <TR key={o.id}>
                        <TD className="font-medium">{o.fullName}</TD>
                        <TD className="text-steel-600">{o.nationality ?? "—"}</TD>
                        <TD className="tabular-nums text-steel-600">{o.ownershipPercent != null ? `${o.ownershipPercent}%` : "—"}</TD>
                        <TD className="text-steel-600">{o.role ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("documents")} />
            <CardContent className="p-0">
              {documents.length === 0 ? (
                <p className="px-5 py-4 text-sm text-steel-500">—</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {documents.map((d) => (
                    <li key={d.id} className="px-5 py-3 text-sm">
                      <p className="font-medium text-ink-900">{d.name}</p>
                      <p className="text-xs text-steel-500">
                        {humanize(d.type)} · {formatDate(d.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {submissions.length ? (
        <Card className="mt-6">
          <CardHeader title={t("history")} />
          <CardContent className="p-0">
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>{t("submittedAt")}</TH>
                  <TH>{t("statusTitle")}</TH>
                  <TH>{t("reviewedAt")}</TH>
                  <TH>{t("reason")}</TH>
                </TR>
              </THead>
              <TBody>
                {submissions.map((s) => (
                  <TR key={s.id}>
                    <TD>{formatDateTime(s.submittedAt, locale)}</TD>
                    <TD>
                      <StatusBadge status={s.status} />
                    </TD>
                    <TD className="text-steel-600">{s.reviewedAt ? formatDateTime(s.reviewedAt, locale) : "—"}</TD>
                    <TD className="text-steel-600">{s.rejectionReason ?? s.notes ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
