import { getLocale, getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/utils";
import type { SegmentStats } from "@/modules/catalog/queries";

/** Data-driven intro paragraph + compact stat strip for industry / province landing pages. */
export async function SegmentIntro({ stats, className }: { stats: SegmentStats; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("marketplace"), getLocale()]);
  const intro = t("manufacturers.intro", {
    count: stats.suppliers,
    verifiedPart: stats.verified ? t("manufacturers.introVerified", { verified: stats.verified }) : "",
    products: stats.products,
    moqPart: stats.typicalMoq ? t("manufacturers.introMoq", { moq: formatNumber(stats.typicalMoq, locale) }) : "",
    leadPart: stats.typicalLeadTimeDays ? t("manufacturers.introLead", { lead: stats.typicalLeadTimeDays }) : "",
    oemPart: t("manufacturers.introOem", { oem: stats.oemCapable }),
  });
  const tiles = [
    { label: t("manufacturers.stats.suppliers"), value: formatNumber(stats.suppliers, locale) },
    { label: t("manufacturers.stats.verified"), value: formatNumber(stats.verified, locale) },
    { label: t("manufacturers.stats.products"), value: formatNumber(stats.products, locale) },
    { label: t("manufacturers.stats.typicalMoq"), value: stats.typicalMoq ? formatNumber(stats.typicalMoq, locale) : "—" },
    { label: t("manufacturers.stats.typicalLead"), value: stats.typicalLeadTimeDays ? t("manufacturers.days", { count: stats.typicalLeadTimeDays }) : "—" },
    { label: t("manufacturers.stats.oem"), value: formatNumber(stats.oemCapable, locale) },
  ];
  return (
    <div className={className}>
      <p className="max-w-3xl text-sm leading-relaxed text-steel-600 sm:text-base">{intro}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((s) => (
          <div key={s.label} className="rounded-lg border border-steel-200 bg-white px-4 py-3 shadow-card">
            <dd className="font-display text-xl font-bold tabular-nums text-ink-900">{s.value}</dd>
            <dt className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-steel-500">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
