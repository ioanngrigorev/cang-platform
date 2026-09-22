"use client";

import { Award, Check, Timer, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { Badge, Button, Card, CardContent, StatusBadge } from "@/components/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { acceptLogisticsQuoteAction, cancelLogisticsRequestAction } from "@/modules/logistics/buyer-actions";

export type LogisticsQuoteRow = {
  id: string;
  status: string;
  currency: string;
  amount: number;
  transitDays: number | null;
  mode: string;
  validUntil: string | null;
  notes: string | null;
  breakdown: Array<{ label: string; amount: number }> | null;
  provider: { id: string; name: string; logoUrl: string | null } | null;
};

export function LogisticsQuotes({
  requestId,
  requestStatus,
  quotes,
  locale,
  orderId,
}: {
  requestId: string;
  requestStatus: string;
  quotes: LogisticsQuoteRow[];
  locale: string;
  orderId: string | null;
}) {
  const t = useTranslations("logistics.detail");
  const tm = useTranslations("logistics.modes");
  const open = quotes.filter((q) => q.status === "SUBMITTED");
  const cheapest = open.length ? Math.min(...open.map((q) => q.amount)) : null;
  const transits = open.map((q) => q.transitDays).filter((v): v is number => typeof v === "number");
  const fastest = transits.length ? Math.min(...transits) : null;
  const canAccept = requestStatus === "OPEN" || requestStatus === "QUOTED";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
      {quotes.map((q) => (
        <Card key={q.id} className={cn(q.status === "ACCEPTED" && "border-success-300 ring-1 ring-success-100")}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{q.provider?.name ?? "—"}</p>
                <p className="text-xs text-steel-500">{tm(q.mode)}</p>
              </div>
              <StatusBadge status={q.status} size="sm" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("font-display text-xl font-semibold tabular-nums", cheapest !== null && q.amount === cheapest && q.status === "SUBMITTED" ? "text-success-700" : "text-ink-900")}>
                {formatMoney(q.amount, q.currency, locale)}
              </span>
              {cheapest !== null && q.amount === cheapest && q.status === "SUBMITTED" ? (
                <Badge variant="success" size="sm">
                  <Award className="size-3" /> {t("amount")}
                </Badge>
              ) : null}
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-steel-500">{t("transit")}</dt>
                <dd className="flex items-center gap-1 text-ink-900">
                  {q.transitDays ? t("days", { n: q.transitDays }) : "—"}
                  {fastest !== null && q.transitDays === fastest && q.status === "SUBMITTED" ? <Timer className="size-3.5 text-info-600" /> : null}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-steel-500">{t("validUntil")}</dt>
                <dd className="text-ink-900">{q.validUntil ? formatDate(q.validUntil, locale) : "—"}</dd>
              </div>
            </dl>

            {q.breakdown?.length ? (
              <details className="rounded-md border border-steel-200 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-steel-600">{t("breakdown")}</summary>
                <ul className="mt-2 space-y-1">
                  {q.breakdown.map((b, i) => (
                    <li key={i} className="flex justify-between text-xs">
                      <span className="text-steel-600">{b.label}</span>
                      <span className="tabular-nums text-ink-900">{formatMoney(b.amount, q.currency, locale)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {q.notes ? <p className="text-xs text-steel-500">{q.notes}</p> : null}

            {q.status === "SUBMITTED" && canAccept ? (
              <DialogForm
                action={acceptLogisticsQuoteAction}
                hidden={{ requestId, quoteId: q.id }}
                title={t("acceptTitle", { provider: q.provider?.name ?? "" })}
                description={t("acceptDescription")}
                submitLabel={t("acceptSubmit")}
                redirectTo={(data) => (data.shipmentId ? `/buyer/shipments/${data.shipmentId}` : `/buyer/logistics/${requestId}`)}
                trigger={(openDialog) => (
                  <Button type="button" variant="primary" size="sm" className="w-full" onClick={openDialog}>
                    <Check /> {t("accept")}
                  </Button>
                )}
              >
                {() => (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-steel-600">{t("provider")}</dt>
                      <dd className="font-medium text-ink-900">{q.provider?.name ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-steel-600">{t("amount")}</dt>
                      <dd className="font-medium tabular-nums text-ink-900">{formatMoney(q.amount, q.currency, locale)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-steel-600">{t("transit")}</dt>
                      <dd className="text-ink-900">{q.transitDays ? t("days", { n: q.transitDays }) : "—"}</dd>
                    </div>
                  </dl>
                )}
              </DialogForm>
            ) : null}

            {q.status === "ACCEPTED" && orderId ? (
              <Button href={`/buyer/orders/${orderId}`} variant="secondary" size="sm" className="w-full">
                {t("viewShipment")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CancelLogisticsRequest({ requestId }: { requestId: string }) {
  const t = useTranslations("logistics.detail");
  return (
    <DialogForm
      action={cancelLogisticsRequestAction}
      hidden={{ requestId }}
      title={t("cancelTitle")}
      description={t("cancelDescription")}
      submitLabel={t("cancelSubmit")}
      submitVariant="danger"
      trigger={(open) => (
        <Button type="button" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={open}>
          <XCircle /> {t("cancelRequest")}
        </Button>
      )}
    >
      {() => null}
    </DialogForm>
  );
}
