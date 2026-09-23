import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { codeLabel } from "@/components/admin/badges";
import { JsonDetails } from "@/components/admin/json-details";
import { RecordCheckButton, VerificationDecisionButtons } from "@/components/admin/verification-actions";
import { Alert, Badge, Card, CardContent, CardHeader, DataList, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime, humanize, localized } from "@/lib/utils";
import { getAdminVerification } from "@/modules/admin/verification/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Verification", robots: { index: false } };

const KNOWN = ["legalName", "registrationNumber", "taxId", "registeredAddress", "countryCode", "representativeName", "representativeRole", "legalRepresentative", "auditor", "score", "scope"];

export default async function AdminVerificationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.verification.review");
  const t = await getTranslations("admin.verification");
  const tc = await getTranslations("admin.common");
  const v = await getAdminVerification(id);
  if (!v) notFound();
  const data = (v.data ?? {}) as Record<string, unknown>;
  const known = KNOWN.filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== "").map((k) => ({ label: t(`fields.${k}`), value: String(data[k]) }));
  const extra = Object.fromEntries(Object.entries(data).filter(([k]) => !KNOWN.includes(k) && k !== "owners" && k !== "submittedBy"));
  const submittedOwners = Array.isArray(data.owners) ? (data.owners as Array<Record<string, unknown>>) : [];

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/verification" }, { label: v.company.name }]}
        eyebrow={codeLabel(v.type)}
        title={
          <Link href={`/admin/companies/${v.companyId}`} className="hover:underline">
            {v.company.name}
          </Link>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={v.status} label={tc(`verification.${v.status}`)} />
            {v.company.isSeller ? <Badge variant="ink">{tc("seller")}</Badge> : null}
            {v.company.isBuyer ? <Badge>{tc("buyer")}</Badge> : null}
            <span>{t("submittedOn", { date: formatDateTime(v.submittedAt, locale) })}</span>
            {v.reviewedBy ? <span>· {t("reviewedBy", { name: v.reviewedBy.name })}</span> : null}
          </span>
        }
        actions={<VerificationDecisionButtons verificationId={v.id} status={v.status} canReview={canPlatform(auth, "admin.verification.review")} />}
      />

      {v.rejectionReason ? (
        <Alert variant="danger" title={t("rejectionReason")} className="mb-6">
          {v.rejectionReason}
        </Alert>
      ) : null}
      {v.notes ? (
        <Alert variant="info" title={t("reviewerNotes")} className="mb-6">
          {v.notes}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("submission")} />
            <CardContent>
              <DataList
                columns={3}
                items={[
                  ...known,
                  { label: t("fields.companyStatus"), value: <StatusBadge status={v.company.status} size="sm" /> },
                  { label: t("fields.companyVerification"), value: <StatusBadge status={v.company.verificationStatus} label={tc(`verification.${v.company.verificationStatus}`)} size="sm" /> },
                  { label: t("fields.country"), value: v.company.country ? `${localized(v.company.country, "name", locale)} (${v.company.countryCode})` : v.company.countryCode },
                  { label: t("fields.expiresAt"), value: v.expiresAt ? formatDate(v.expiresAt, locale) : "—" },
                ]}
              />
              {Object.keys(extra).length ? <JsonDetails summary={t("rawData")} value={extra} className="mt-4" /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("documents")} description={t("documentsHint")} />
            <CardContent className="p-0">
              {v.documents.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noDocuments")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {v.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <FileText className="size-4 shrink-0 text-steel-400" />
                      <div className="min-w-0 flex-1">
                        <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-ink-900 hover:underline">
                          {d.name}
                        </a>
                        <p className="text-xs text-steel-500">
                          {humanize(d.type)} · {d.mimeType} · {(d.sizeBytes / 1024).toFixed(0)} KB · {formatDate(d.createdAt, locale)}
                        </p>
                      </div>
                      <Badge size="sm" variant="outline">
                        {d.visibility}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("owners")} />
            <CardContent className="p-0">
              {v.owners.length === 0 && submittedOwners.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noOwners")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("ownerName")}</TH>
                      <TH>{t("ownerRole")}</TH>
                      <TH className="text-right">{t("ownership")}</TH>
                      <TH>{t("nationality")}</TH>
                      <TH>{t("pep")}</TH>
                      <TH>{t("sanctions")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {v.owners.map((o) => (
                      <TR key={o.id}>
                        <TD className="font-medium">
                          {o.fullName}
                          {o.idDocument ? (
                            <a href={o.idDocument.url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-brand-700 hover:underline">
                              {tc("document")}
                            </a>
                          ) : null}
                        </TD>
                        <TD>{o.role ?? "—"}</TD>
                        <TD className="text-right tabular-nums">{o.ownershipPercent != null ? `${o.ownershipPercent}%` : "—"}</TD>
                        <TD>{o.nationality ?? "—"}</TD>
                        <TD>{o.isPep ? <Badge variant="warning" size="sm">{tc("yes")}</Badge> : tc("no")}</TD>
                        <TD>
                          <StatusBadge status={o.sanctionsStatus} size="sm" />
                        </TD>
                      </TR>
                    ))}
                    {v.owners.length === 0
                      ? submittedOwners.map((o, i) => (
                          <TR key={i}>
                            <TD className="font-medium">{String(o.fullName ?? "")}</TD>
                            <TD>{String(o.role ?? "—")}</TD>
                            <TD className="text-right tabular-nums">{o.ownershipPercent != null ? `${o.ownershipPercent}%` : "—"}</TD>
                            <TD>{String(o.nationality ?? "—")}</TD>
                            <TD>{o.isPep ? tc("yes") : tc("no")}</TD>
                            <TD>—</TD>
                          </TR>
                        ))
                      : null}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("complianceChecks")} description={t("complianceChecksHint")} action={canPlatform(auth, "admin.compliance.review") ? <RecordCheckButton verificationId={v.id} /> : null} />
            <CardContent className="p-0">
              {v.checks.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{t("noChecks")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("checkType")}</TH>
                      <TH>{t("checkResult")}</TH>
                      <TH className="text-right">{t("riskScore")}</TH>
                      <TH className="hidden md:table-cell">{t("provider")}</TH>
                      <TH className="hidden md:table-cell">{t("checkedAt")}</TH>
                      <TH className="hidden lg:table-cell">{tc("note")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {v.checks.map((c) => (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.type.replace(/_/g, " ")}</TD>
                        <TD>
                          <StatusBadge status={c.status} size="sm" />
                        </TD>
                        <TD className="text-right tabular-nums">{c.riskScore ?? "—"}</TD>
                        <TD className="hidden text-xs md:table-cell">{c.provider ?? "—"}</TD>
                        <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">
                          {c.checkedAt ? formatDate(c.checkedAt, locale) : "—"}
                          {c.reviewedBy ? <span className="block text-[11px] text-steel-400">{c.reviewedBy.name}</span> : null}
                        </TD>
                        <TD className="hidden max-w-[260px] truncate text-xs text-steel-600 lg:table-cell" title={c.notes ?? undefined}>
                          {c.notes ?? "—"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("companySnapshot")} />
            <CardContent>
              <DataList
                columns={1}
                items={[
                  { label: t("fields.legalName"), value: v.company.legalName ?? "—" },
                  { label: t("fields.taxId"), value: v.company.taxId ?? "—" },
                  { label: t("fields.registrationNumber"), value: v.company.registrationNumber ?? "—" },
                  { label: t("fields.registeredAddress"), value: [v.company.address, v.company.city].filter(Boolean).join(", ") || "—" },
                  { label: t("fields.kybStatus"), value: <StatusBadge status={v.company.kybStatus} label={tc(`verification.${v.company.kybStatus}`)} size="sm" /> },
                  { label: t("sanctions"), value: <StatusBadge status={v.company.sanctionsStatus} size="sm" /> },
                ]}
              />
              <Link href={`/admin/companies/${v.companyId}`} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
                {t("openCompany")}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("history")} />
            <CardContent className="p-0">
              <ul className="divide-y divide-steel-100">
                {v.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <div>
                      {h.id === v.id ? (
                        <span className="font-medium text-ink-900">{codeLabel(h.type)}</span>
                      ) : (
                        <Link href={`/admin/verification/${h.id}`} className="font-medium text-ink-900 hover:underline">
                          {codeLabel(h.type)}
                        </Link>
                      )}
                      <p className="text-xs text-steel-500">{formatDate(h.submittedAt, locale)}</p>
                    </div>
                    <StatusBadge status={h.status} size="sm" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
