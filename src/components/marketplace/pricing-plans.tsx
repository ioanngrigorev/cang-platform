"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";

export type PricingPlan = {
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
  isEnterprise?: boolean;
  limits: { maxProducts: number | null; teamSeats: number | null; featuredSlots: number; maxRfqResponsesPerMonth: number | null };
};

export type PricingLabels = {
  monthly: string;
  yearly: string;
  yearlySave: string;
  perMonth: string;
  perYear: string;
  /** Templates with placeholders — plain strings so the bundle stays serialisable across the server/client boundary. */
  billedYearly: string; // "{amount} billed yearly"
  free: string;
  custom: string;
  cta: string;
  ctaEnterprise: string;
  ctaFree: string;
  popular: string;
  products: string; // "{n} products"
  seats: string; // "{n} team seats"
  rfqResponses: string; // "{n} RFQ responses / month"
  unlimited: string;
};

/** Plan comparison with a monthly / yearly billing toggle. */
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

export function PricingPlans({ plans, locale, labels }: { plans: PricingPlan[]; locale: string; labels: PricingLabels }) {
  const [cycle, setCycle] = React.useState<"monthly" | "yearly">("yearly");
  const savings = React.useMemo(() => {
    const p = plans.find((x) => x.priceMonthly > 0 && x.priceYearly > 0);
    if (!p) return 0;
    return Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100);
  }, [plans]);
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div role="radiogroup" aria-label="Billing cycle" className="inline-flex items-center rounded-full border border-steel-300 bg-white p-1 text-sm shadow-card">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cycle === c}
              onClick={() => setCycle(c)}
              className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", cycle === c ? "bg-ink-900 text-white" : "text-steel-600 hover:text-ink-900")}
            >
              {c === "monthly" ? labels.monthly : labels.yearly}
              {c === "yearly" && savings > 0 ? <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold", cycle === c ? "bg-brand-500 text-on-brand" : "bg-brass-100 text-brass-800")}>{fill(labels.yearlySave, { percent: String(savings) })}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("mx-auto grid gap-5 md:grid-cols-2", plans.length >= 4 ? "xl:grid-cols-4" : "xl:max-w-5xl xl:grid-cols-3")}>
        {plans.map((p) => {
          const isFree = p.priceMonthly === 0 && !p.isEnterprise;
          const monthlyEquivalent = cycle === "yearly" && p.priceYearly > 0 ? p.priceYearly / 12 : p.priceMonthly;
          return (
            <div key={p.code} className={cn("relative flex flex-col rounded-lg border bg-white p-6 shadow-card", p.highlighted ? "border-ink-900 ring-1 ring-ink-900" : "border-steel-200")}>
              {p.highlighted ? <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-brand">{labels.popular}</span> : null}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.description ? <p className="mt-1 min-h-10 text-sm text-steel-600">{p.description}</p> : null}
              <div className="mt-5">
                {p.isEnterprise ? (
                  <p className="font-display text-3xl font-bold text-ink-900">{labels.custom}</p>
                ) : isFree ? (
                  <p className="font-display text-3xl font-bold text-ink-900">{labels.free}</p>
                ) : (
                  <>
                    <p className="font-display text-3xl font-bold tabular-nums text-ink-900">
                      {formatMoney(Math.round(monthlyEquivalent), p.currency, locale, { maxFractionDigits: 0 })}
                      <span className="ml-1 text-sm font-normal text-steel-500">{labels.perMonth}</span>
                    </p>
                    {cycle === "yearly" ? <p className="mt-1 text-xs text-steel-500">{fill(labels.billedYearly, { amount: formatMoney(p.priceYearly, p.currency, locale, { maxFractionDigits: 0 }) })}</p> : null}
                  </>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm text-steel-700">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" />
                  {fill(labels.products, { n: p.limits.maxProducts == null ? labels.unlimited : String(p.limits.maxProducts) })}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" />
                  {fill(labels.rfqResponses, { n: p.limits.maxRfqResponsesPerMonth == null ? labels.unlimited : String(p.limits.maxRfqResponsesPerMonth) })}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-600" />
                  {fill(labels.seats, { n: p.limits.teamSeats == null ? labels.unlimited : String(p.limits.teamSeats) })}
                </li>
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button href={p.isEnterprise ? "/contact" : `/register?type=seller&plan=${p.code.toLowerCase()}`} variant={p.highlighted ? "primary" : "secondary"} className="w-full">
                  {p.isEnterprise ? labels.ctaEnterprise : isFree ? labels.ctaFree : labels.cta}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
