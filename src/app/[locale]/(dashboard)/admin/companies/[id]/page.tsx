import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { codeLabel } from "@/components/admin/badges";
import { CertificationReviewButtons, CompanyAdminActions, RemoveBadgeButton } from "@/components/admin/company-actions";
import { Avatar, Badge, Card, CardContent, CardHeader, DataList, PageHeader, RatingStars, StatCard, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { employeeRangeLabel, formatDate, formatDateTime, formatMoney, humanize, localized, timeAgo } from "@/lib/utils";
import { getAdminCompany } from "@/modules/admin/companies/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Company", robots: { index: false } };

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const auth = await requireAdmin("admin.companies.read");
  const t = await getTranslations("admin.companies");
  const tc = await getTranslations("admin.common");
  const c = await getAdminCompany(id);
  if (!c) notFound();
  const canWrite = canPlatform(auth, "admin.companies.write");
  const activeSub = c.subscriptions.find((s) => s.status === "ACTIVE");
  const mp = c.manufacturerProfile;
  const bp = c.buyerProfile;

  return (
    <div className="max-w-none">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: "/admin/companies" }, { label: c.name }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={c.name} src={c.logoUrl} size={40} square />
            {c.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {c.isSeller ? <Badge variant="ink">{tc("seller")}</Badge> : null}
            {c.isBuyer ? <Badge>{tc("buyer")}</Badge> : null}
            <StatusBadge status={c.status} />
            <StatusBadge status={c.verificationStatus} label={tc(`verification.${c.verificationStatus}`)} />
            {c.isFeatured ? <Badge variant="brass">{t("featured")}</Badge> : null}
            {activeSub ? <Badge variant="outline">{activeSub.plan.name}</Badge> : null}
            {c.isSeller ? (
              <Link href={`/supplier/${c.slug}`} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                <ExternalLink className="size-3" /> {t("publicProfile")}
              </Link>
            ) : null}
          </span>
        }
        actions={
          <CompanyAdminActions
            companyId={c.id}
            status={c.status}
            verificationStatus={c.verificationStatus}
            isFeatured={c.isFeatured}
            badges={c.allBadges.map((b) => ({ id: b.id, code: b.code, name: localized(b, "name", locale) }))}
            canWrite={canWrite}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("colProducts")} value={c.productCount} />
        <StatCard label={t("colOrders")} value={c.gmv.reduce((s, g) => s + g.n, 0)} hint={c.gmv.map((g) => `${g.side === "SUPPLIER" ? tc("seller") : tc("buyer")}: ${formatMoney(g.total, g.currency, locale, { compact: true })}`).join(" · ") || undefined} />
        <StatCard label={t("rating")} value={<RatingStars value={c.ratingAvg} count={c.ratingCount} size={16} />} />
        <StatCard label={t("riskFlags")} value={c.riskFlags.filter((r) => r.status === "OPEN" || r.status === "INVESTIGATING").length} hint={t("riskFlagsHint", { total: c.riskFlags.length })} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={t("profile")} />
            <CardContent>
              <DataList
                columns={3}
                items={[
                  { label: t("legalName"), value: c.legalName ?? "—" },
                  { label: t("businessType"), value: humanize(c.businessType) },
                  { label: t("country"), value: c.country ? `${localized(c.country, "name", locale)} (${c.countryCode})` : c.countryCode },
                  { label: t("taxId"), value: c.taxId ?? "—" },
                  { label: t("registrationNumber"), value: c.registrationNumber ?? "—" },
                  { label: t("address"), value: [c.address, c.city].filter(Boolean).join(", ") || "—" },
                  { label: t("contact"), value: [c.email, c.phone].filter(Boolean).join(" · ") || "—" },
                  { label: t("website"), value: c.website ?? "—" },
                  { label: t("employees"), value: employeeRangeLabel(c.employeeRange) },
                  { label: t("established"), value: c.yearEstablished ?? "—" },
                  { label: t("sanctions"), value: humanize(c.sanctionsStatus) },
                  { label: t("createdAt"), value: formatDateTime(c.createdAt, locale) },
                ]}
              />
              {c.description ? <p className="mt-4 text-sm text-steel-600">{c.description}</p> : null}
            </CardContent>
          </Card>

          {mp ? (
            <Card>
              <CardHeader title={t("manufacturerProfile")} />
              <CardContent>
                <DataList
                  columns={3}
                  items={[
                    { label: t("factoryAddress"), value: mp.factoryAddress ?? "—" },
                    { label: t("factorySize"), value: mp.factorySizeSqm ? `${mp.factorySizeSqm} m²` : "—" },
                    { label: t("productionLines"), value: mp.productionLines ?? "—" },
                    { label: t("capacity"), value: mp.annualCapacity ?? "—" },
                    { label: t("capabilities"), value: [mp.oemCapable ? "OEM" : null, mp.odmCapable ? "ODM" : null, mp.privateLabelCapable ? "Private label" : null].filter(Boolean).join(" · ") || "—" },
                    { label: t("exportCountries"), value: mp.exportCountries.join(", ") || "—" },
                    { label: t("leadTime"), value: mp.avgLeadTimeDays ? `${mp.avgLeadTimeDays} d` : "—" },
                    { label: t("minOrder"), value: mp.minOrderValueUsd ? formatMoney(mp.minOrderValueUsd, "USD", locale) : "—" },
                    { label: t("incoterms"), value: mp.acceptedIncoterms.join(", ") || "—" },
                  ]}
                />
              </CardContent>
            </Card>
          ) : null}

          {bp ? (
            <Card>
              <CardHeader title={t("buyerProfile")} />
              <CardContent>
                <DataList
                  columns={3}
                  items={[
                    { label: t("sourcingCategories"), value: bp.sourcingCategories.join(", ") || "—" },
                    { label: t("purchasingVolume"), value: bp.annualPurchasingVolumeUsd ? formatMoney(bp.annualPurchasingVolumeUsd, "USD", locale) : "—" },
                    { label: t("destinations"), value: bp.destinationCountries.join(", ") || "—" },
                    { label: t("preferredCurrency"), value: bp.preferredCurrency },
                    { label: t("incoterms"), value: bp.preferredIncoterms.join(", ") || "—" },
                  ]}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t("members")} />
            <CardContent className="p-0">
              <Table className="border-0">
                <THead>
                  <TR>
                    <TH>{t("member")}</TH>
                    <TH>{t("memberRole")}</TH>
                    <TH>{tc("status")}</TH>
                    <TH className="hidden sm:table-cell">{t("joined")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {c.members.map((m) => (
                    <TR key={m.id}>
                      <TD>
                        <Link href={`/admin/users/${m.userId}`} className="font-medium text-ink-900 hover:underline">
                          {m.user.name}
                        </Link>
                        <p className="text-xs text-steel-500">{m.user.email}</p>
                      </TD>
                      <TD>
                        {m.role}
                        {m.isPrimary ? <span className="ml-1 text-xs text-steel-500">({t("primary")})</span> : null}
                      </TD>
                      <TD>
                        <StatusBadge status={m.status} size="sm" />
                      </TD>
                      <TD className="hidden text-xs text-steel-600 sm:table-cell">{formatDate(m.joinedAt, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("certifications")} description={t("certificationsHint")} />
            <CardContent className="p-0">
              {c.certifications.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <Table className="border-0">
                  <THead>
                    <TR>
                      <TH>{t("certification")}</TH>
                      <TH className="hidden md:table-cell">{t("certificateNumber")}</TH>
                      <TH className="hidden md:table-cell">{t("expires")}</TH>
                      <TH>{tc("status")}</TH>
                      <TH className="text-right">{tc("actions")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {c.certifications.map((cc) => (
                      <TR key={cc.id}>
                        <TD>
                          <span className="font-medium">{cc.certification.name}</span>
                          {cc.document ? (
                            <a href={cc.document.url} target="_blank" rel="noreferrer" className="ml-2 text-xs text-brand-700 hover:underline">
                              {tc("document")}
                            </a>
                          ) : null}
                        </TD>
                        <TD className="hidden text-xs md:table-cell">{cc.certificateNumber ?? "—"}</TD>
                        <TD className="hidden text-xs md:table-cell">{cc.expiresAt ? formatDate(cc.expiresAt, locale) : "—"}</TD>
                        <TD>
                          <StatusBadge status={cc.status} size="sm" />
                        </TD>
                        <TD className="text-right">{canWrite && cc.status !== "VERIFIED" ? <CertificationReviewButtons companyId={c.id} companyCertificationId={cc.id} /> : null}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("reviews")} />
            <CardContent className="p-0">
              {c.receivedReviews.length === 0 ? (
                <p className="px-5 py-6 text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="divide-y divide-steel-100">
                  {c.receivedReviews.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <RatingStars value={r.ratingOverall} size={12} />
                        <p className="truncate text-ink-900">{r.title ?? "—"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-steel-500">
                        {r.fraudScore > 0 ? <span>{t("fraudScore", { score: r.fraudScore })}</span> : null}
                        <StatusBadge status={r.status} size="sm" />
                        <span>{timeAgo(r.createdAt, locale)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("badges")} />
            <CardContent>
              {c.badges.length === 0 ? (
                <p className="text-sm text-steel-500">{tc("none")}</p>
              ) : (
                <ul className="space-y-2">
                  {c.badges.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{localized(b.badge, "name", locale)}</p>
                        <p className="text-xs text-steel-500">
                          {b.source === "MANUAL" ? t("manualBadge", { by: b.grantedBy?.name ?? "—" }) : t("ruleBadge")} · {formatDate(b.grantedAt, locale)}
                        </p>
                        {b.note ? <p className="text-xs text-steel-600">{b.note}</p> : null}
                      </div>
                      {canWrite && b.source === "MANUAL" ? <RemoveBadgeButton companyId={c.id} companyBadgeId={b.id} /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("verifications")} />
            <CardContent className="p-0">
              <ul className="divide-y divide-steel-100">
                {c.verifications.length === 0 ? <li className="px-5 py-4 text-sm text-steel-500">{tc("none")}</li> : null}
                {c.verifications.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <div>
                      <Link href={`/admin/verification/${v.id}`} className="font-medium text-ink-900 hover:underline">
                        {codeLabel(v.type)}
                      </Link>
                      <p className="text-xs text-steel-500">{formatDate(v.submittedAt, locale)}</p>
                    </div>
                    <StatusBadge status={v.status} size="sm" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("riskFlags")} />
            <CardContent className="p-0">
              <ul className="divide-y divide-steel-100">
                {c.riskFlags.length === 0 ? <li className="px-5 py-4 text-sm text-steel-500">{tc("none")}</li> : null}
                {c.riskFlags.map((r) => (
                  <li key={r.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">{r.ruleCode}</span>
                      <span className="flex gap-1">
                        <Badge size="sm" variant={r.severity === "CRITICAL" || r.severity === "HIGH" ? "danger" : r.severity === "MEDIUM" ? "warning" : "neutral"}>
                          {r.severity}
                        </Badge>
                        <StatusBadge status={r.status} size="sm" />
                      </span>
                    </div>
                    <p className="text-xs text-steel-600">{r.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("notes")} description={t("notesHint")} />
            <CardContent className="p-0">
              <ul className="divide-y divide-steel-100">
                {c.notes.length === 0 ? <li className="px-5 py-4 text-sm text-steel-500">{tc("none")}</li> : null}
                {c.notes.map((n) => (
                  <li key={n.id} className="px-5 py-2.5 text-sm">
                    <p className="whitespace-pre-wrap text-ink-900">{String((n.after as { note?: string } | null)?.note ?? "")}</p>
                    <p className="mt-0.5 text-xs text-steel-500">
                      {n.actorName ?? "—"} · {timeAgo(n.createdAt, locale)}
                    </p>
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
