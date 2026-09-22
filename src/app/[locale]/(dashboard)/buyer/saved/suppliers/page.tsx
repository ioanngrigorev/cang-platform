import { Bookmark, FileText, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SaveButton } from "@/components/buyer/save-button";
import { Avatar, Button, Card, CardContent, EmptyState, PageHeader, RatingStars, TrustBadges, VerifiedMark } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { humanize, localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { listSavedSuppliers } from "@/modules/saved/queries";

export const metadata: Metadata = { title: "Saved suppliers", robots: { index: false } };

export default async function SavedSuppliersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user } = await requireCompany({ buyer: true });
  const t = await getTranslations("buyer.saved");

  const rows = await listSavedSuppliers(user.id);

  return (
    <>
      <PageHeader title={t("suppliersTitle")} description={t("suppliersDescription")} actions={<Button href="/manufacturers" variant="secondary">{t("browseSuppliers")}</Button>} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title={t("emptySuppliers")}
          description={t("emptySuppliersHint")}
          action={
            <Button href="/manufacturers" variant="primary">
              {t("browseSuppliers")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {rows.map((row) => {
            const s = row.supplier!;
            return (
              <Card key={row.id} hover>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={s.logoUrl} name={s.name} size={44} square />
                    <div className="min-w-0 flex-1">
                      <Link href={`/supplier/${s.slug}`} className="flex items-center gap-1 font-semibold text-ink-900 hover:underline">
                        <span className="truncate">{s.name}</span>
                        <VerifiedMark status={s.verificationStatus} />
                      </Link>
                      <p className="truncate text-xs text-steel-500">
                        {[s.city, s.countryCode].filter(Boolean).join(", ")} · {humanize(s.businessType)}
                      </p>
                      <RatingStars value={s.ratingAvg} count={s.ratingCount} className="mt-1" />
                    </div>
                  </div>
                  {s.tagline ? <p className="line-clamp-2 text-sm text-steel-600">{s.tagline}</p> : null}
                  <TrustBadges
                    codes={s.badges.map((b) => b.badge.code)}
                    labels={Object.fromEntries(s.badges.map((b) => [b.badge.code, localized(b.badge, "name", locale)]))}
                    size="sm"
                    max={3}
                  />
                  {row.note ? <p className="rounded-md bg-steel-50 px-2.5 py-1.5 text-xs text-steel-600">{row.note}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button href={`/buyer/rfqs/new?supplier=${s.id}`} variant="primary" size="sm">
                      <FileText /> {t("requestQuote")}
                    </Button>
                    <Button href={`/buyer/messages/new?supplier=${s.slug}`} variant="ghost" size="sm">
                      <MessageSquare /> {t("message")}
                    </Button>
                    <SaveButton kind="supplier" id={s.id} saved labelSave={t("save")} labelSaved={t("saved")} size="sm" variant="ghost" />
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
