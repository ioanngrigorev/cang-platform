"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Badge, Card, CardContent, CardHeader, SubmitButton, useActionForm } from "@/components/ui";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { refreshCreditScoreAction } from "@/modules/financing/actions";

export type ScoreSnapshot = {
  score: number;
  grade: string;
  computedAt: string;
  features: Record<string, number | string | boolean | null>;
  breakdown: Array<{ rule: string; value: unknown; points: number }> | null;
} | null;

const GRADE_TONE: Record<string, string> = {
  A: "bg-success-50 text-success-700 ring-success-200",
  B: "bg-info-50 text-info-700 ring-info-200",
  C: "bg-warning-50 text-warning-700 ring-warning-200",
  D: "bg-danger-50 text-danger-700 ring-danger-200",
};

export function CreditScoreCard({ snapshot, locale }: { snapshot: ScoreSnapshot; locale: string }) {
  const t = useTranslations("financing.score");
  const { formAction } = useActionForm(refreshCreditScoreAction);

  const formatValue = (key: string, value: unknown) => {
    if (value === null || value === undefined) return t("noData");
    if (typeof value === "number") {
      if (key === "disputeRate" || key === "onTimePaymentRate" || key === "onTimeDeliveryRate") return `${Math.round(value * 100)}%`;
      if (key === "gmv12m") return formatNumber(Math.round(value), locale);
      return formatNumber(value, locale);
    }
    return String(value);
  };

  return (
    <Card>
      <CardHeader
        title={t("title")}
        description={t("hint")}
        action={
          <form action={formAction}>
            <SubmitButton variant="ghost" size="sm">
              <RefreshCw /> {t("refresh")}
            </SubmitButton>
          </form>
        }
      />
      <CardContent className="space-y-5">
        {!snapshot ? (
          <div>
            <p className="text-sm font-medium text-ink-900">{t("none")}</p>
            <p className="mt-1 text-sm text-steel-500">{t("noneHint")}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className={cn("flex size-20 shrink-0 flex-col items-center justify-center rounded-full ring-2", GRADE_TONE[snapshot.grade] ?? GRADE_TONE.C)}>
                <span className="font-display text-2xl font-semibold tabular-nums">{snapshot.score}</span>
                <span className="text-[10px] uppercase tracking-wide">{t("outOf")}</span>
              </div>
              <div>
                <Badge variant={snapshot.grade === "A" ? "success" : snapshot.grade === "B" ? "info" : snapshot.grade === "C" ? "warning" : "danger"} size="lg">
                  {t("grade", { grade: snapshot.grade })}
                </Badge>
                <p className="mt-1 text-xs text-steel-500">{t("computed", { date: formatDate(snapshot.computedAt, locale) })}</p>
              </div>
              <div className="min-w-[160px] flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-steel-100">
                  <div
                    className={cn("h-full rounded-full", snapshot.score >= 80 ? "bg-success-500" : snapshot.score >= 65 ? "bg-info-500" : snapshot.score >= 50 ? "bg-warning-500" : "bg-danger-500")}
                    style={{ width: `${snapshot.score}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel-500">{t("features")}</p>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {Object.entries(snapshot.features).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-steel-100 pb-1">
                    <dt className="text-steel-600">{t.has(`featureLabels.${k}`) ? t(`featureLabels.${k}`) : k}</dt>
                    <dd className="font-medium tabular-nums text-ink-900">{formatValue(k, v)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {snapshot.breakdown?.length ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel-500">{t("breakdown")}</p>
                <ul className="space-y-1.5">
                  {snapshot.breakdown.map((b) => (
                    <li key={b.rule} className="flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 text-steel-600">{t.has(`ruleLabels.${b.rule}`) ? t(`ruleLabels.${b.rule}`) : b.rule}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-steel-100">
                        <span className="block h-full rounded-full bg-ink-800" style={{ width: `${Math.min(100, (b.points / 20) * 100)}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right tabular-nums text-ink-900">{b.points}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
