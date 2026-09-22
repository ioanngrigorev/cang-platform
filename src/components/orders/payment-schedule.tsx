"use client";

import { Banknote, CheckCircle2, Copy, Landmark, Lock, ShieldCheck, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm } from "@/components/buyer/action-form";
import { Alert, Badge, Button, StatusBadge } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatMoney, humanize } from "@/lib/utils";
import { initiatePaymentAction, simulateBankConfirmationAction } from "@/modules/payments/buyer-actions";

export type SchedulePayment = {
  id: string;
  paymentNumber: string;
  kind: string;
  status: string;
  escrowStatus: string;
  currency: string;
  amount: number;
  milestoneLabel: string | null;
  dueAt: Date | string | null;
  paidAt: Date | string | null;
  instructions: Record<string, unknown> | null;
  provider: { id: string; name: string; code: string } | null;
};

const PAYABLE = ["CREATED", "PENDING", "FAILED"];

/** Per-milestone payment panel: amount, escrow state, "Pay now" and the provider's transfer instructions. */
export function PaymentSchedule({ payments, locale, demoMode }: { payments: SchedulePayment[]; locale: string; demoMode: boolean }) {
  const t = useTranslations("payments.schedule");
  if (!payments.length) return <p className="text-sm text-steel-500">{t("empty")}</p>;

  return (
    <ul className="divide-y divide-steel-100">
      {payments.map((p) => (
        <PaymentRow key={p.id} payment={p} locale={locale} demoMode={demoMode} t={t} />
      ))}
    </ul>
  );
}

function PaymentRow({ payment: p, locale, demoMode, t }: { payment: SchedulePayment; locale: string; demoMode: boolean; t: ReturnType<typeof useTranslations> }) {
  const [showInstructions, setShowInstructions] = React.useState(false);
  const instructions = p.instructions as Record<string, string | number> | null;
  const isPaid = p.status === "PAID" || p.status === "SETTLED";
  const held = p.escrowStatus === "HELD" || p.escrowStatus === "PARTIALLY_RELEASED";

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink-900">{p.milestoneLabel ?? humanize(p.kind)}</span>
            <StatusBadge status={p.status} size="sm" />
            {held ? (
              <Badge variant="brass" size="sm">
                <Lock className="size-3" /> {t("escrowHeld")}
              </Badge>
            ) : null}
            {p.escrowStatus === "RELEASED" ? (
              <Badge variant="success" size="sm">
                <ShieldCheck className="size-3" /> {t("escrowReleased")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-steel-500">
            {p.paymentNumber}
            {p.dueAt && !isPaid ? ` · ${t("due", { date: formatDate(p.dueAt, locale) })}` : ""}
            {p.paidAt ? ` · ${t("paidOn", { date: formatDate(p.paidAt, locale) })}` : ""}
            {p.provider ? ` · ${p.provider.name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="font-display text-lg font-semibold tabular-nums text-ink-900">{formatMoney(p.amount, p.currency, locale)}</span>
          <div className="flex flex-wrap items-center gap-2">
            {PAYABLE.includes(p.status) ? (
              <ActionForm
                action={initiatePaymentAction}
                hidden={{ paymentId: p.id }}
                label={p.status === "PENDING" ? t("showInstructions") : t("payNow")}
                icon={<Banknote />}
                variant="primary"
                size="sm"
              />
            ) : null}
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-success-700">
                <CheckCircle2 className="size-4" /> {t("paid")}
              </span>
            ) : null}
            {demoMode && PAYABLE.includes(p.status) ? (
              <ActionForm action={simulateBankConfirmationAction} hidden={{ paymentId: p.id }} label={t("simulate")} icon={<Zap />} variant="subtle" size="sm" />
            ) : null}
            <Button href={`/buyer/payments/${p.id}`} variant="ghost" size="sm">
              {t("details")}
            </Button>
          </div>
        </div>
      </div>

      {instructions && p.status === "PENDING" ? (
        <div className="mt-3 rounded-md border border-info-100 bg-info-50/60 p-3">
          <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-info-700" onClick={() => setShowInstructions((v) => !v)} aria-expanded={showInstructions}>
            <span className="inline-flex items-center gap-2">
              <Landmark className="size-4" /> {t("instructionsTitle")}
            </span>
            <span className="text-xs">{showInstructions ? t("hide") : t("show")}</span>
          </button>
          {showInstructions ? (
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {Object.entries(instructions).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-steel-500">{humanize(k.replace(/([A-Z])/g, "_$1"))}</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 break-words font-medium text-ink-900">
                    {String(v)}
                    <CopyButton value={String(v)} label={t("copy")} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {showInstructions ? <Alert variant="info" className="mt-3 text-xs">{t("instructionsHint")}</Alert> : null}
        </div>
      ) : null}
    </li>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("rounded p-0.5 text-steel-400 hover:bg-white hover:text-ink-900", copied && "text-success-600")}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
    >
      <Copy className="size-3.5" />
    </button>
  );
}

/** Small link shown under the schedule when the order has invoices. */
export function InvoiceLinks({ invoices, label, locale }: { invoices: Array<{ id: string; invoiceNumber: string; total: number; currency: string; status: string }>; label: string; locale: string }) {
  if (!invoices.length) return null;
  return (
    <div className="mt-4 border-t border-steel-100 pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <ul className="space-y-1.5">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-3 text-sm">
            <Link href={`/buyer/invoices/${inv.id}`} className="font-medium text-ink-900 hover:underline">
              {inv.invoiceNumber}
            </Link>
            <span className="flex items-center gap-2">
              <span className="tabular-nums text-steel-600">{formatMoney(inv.total, inv.currency, locale)}</span>
              <StatusBadge status={inv.status} size="sm" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
