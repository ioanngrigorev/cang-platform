"use client";

import { Award, Check, MessageSquare, RefreshCw, ShieldCheck, Timer, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { DialogForm } from "@/components/buyer/action-form";
import { Badge, Button, Checkbox, Field, Input, RatingStars, StatusBadge, Textarea, TrustBadges, useActionForm } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { acceptQuotationAction, rejectQuotationAction, requestRevisionAction, saveBuyerNotesAction } from "@/modules/rfq/actions";

export type ComparisonQuotation = {
  id: string;
  quotationNumber: string;
  status: string;
  revisionNumber: number;
  currency: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  moq: number | null;
  leadTimeDays: number | null;
  incoterm: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  sampleAvailable: boolean;
  samplePrice: number | null;
  notes: string | null;
  buyerNotes: string | null;
  items: Array<{ id: string; rfqItemId: string | null; description: string; quantity: number; unit: string; unitPrice: number; total: number }>;
  supplier: { id: string; name: string; slug: string; verificationStatus: string; ratingAvg: number; ratingCount: number; countryCode?: string | null; city?: string | null };
  badges: string[];
};

export type ComparisonRfqItem = { id: string; productName: string; quantity: number; unit: string };

const ACTIONABLE = ["SUBMITTED", "UNDER_REVIEW", "REVISED"];

export function QuotationComparison({
  rfqId,
  rfqStatus,
  quotations,
  rfqItems,
  locale,
  defaultAddress,
  tradeAssuranceDefault = true,
  countries,
}: {
  rfqId: string;
  rfqStatus: string;
  quotations: ComparisonQuotation[];
  rfqItems: ComparisonRfqItem[];
  locale: string;
  defaultAddress: { company?: string; contactName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; countryCode?: string };
  tradeAssuranceDefault?: boolean;
  countries: Array<{ code: string; name: string }>;
}) {
  const t = useTranslations("rfq.compare");
  const [selected, setSelected] = React.useState<string[]>(quotations.map((q) => q.id));

  const shown = quotations.filter((q) => selected.includes(q.id));
  const active = shown.filter((q) => ACTIONABLE.includes(q.status) || q.status === "ACCEPTED");
  const bestTotal = active.length ? Math.min(...active.map((q) => q.total)) : null;
  const leadTimes = active.map((q) => q.leadTimeDays).filter((v): v is number => typeof v === "number");
  const bestLead = leadTimes.length ? Math.min(...leadTimes) : null;

  const rowLabel =
    "sticky left-0 z-10 w-[124px] min-w-[124px] sm:w-[190px] sm:min-w-[190px] bg-steel-50 px-3 py-3 sm:px-4 text-left text-xs font-semibold uppercase tracking-wide text-steel-500";
  const cell = "min-w-[210px] sm:min-w-[240px] border-l border-steel-100 px-3 py-3 sm:px-4 align-top text-sm";

  return (
    <div className="space-y-3">
      {quotations.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-steel-600">{t("show")}</span>
          {quotations.map((q) => (
            <label key={q.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1", selected.includes(q.id) ? "border-ink-900 bg-ink-900 text-white" : "border-steel-300 bg-white text-steel-600")}>
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(q.id)}
                onChange={() => setSelected(selected.includes(q.id) ? selected.filter((x) => x !== q.id) : [...selected, q.id])}
              />
              {q.supplier.name}
            </label>
          ))}
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-lg border border-steel-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-steel-200">
              <th scope="col" className={cn(rowLabel, "align-bottom")}>
                {t("supplier")}
              </th>
              {shown.map((q) => (
                <th key={q.id} scope="col" className={cn(cell, "bg-white text-left align-top")}>
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/supplier/${q.supplier.slug}`} className="font-semibold text-ink-900 hover:underline">
                        {q.supplier.name}
                      </Link>
                      <StatusBadge status={q.status} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars value={q.supplier.ratingAvg} count={q.supplier.ratingCount} size={12} />
                      {q.supplier.verificationStatus === "VERIFIED" ? (
                        <Badge variant="success" size="sm">
                          <ShieldCheck className="size-3" /> {t("verified")}
                        </Badge>
                      ) : null}
                    </div>
                    {q.supplier.city ? <p className="text-xs font-normal text-steel-500">{q.supplier.city}</p> : null}
                    <TrustBadges codes={q.badges} size="sm" max={3} />
                    <p className="text-xs font-normal text-steel-500">
                      {q.quotationNumber}
                      {q.revisionNumber > 1 ? ` · ${t("revision", { n: q.revisionNumber })}` : ""}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {rfqItems.length > 0
              ? rfqItems.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className={rowLabel}>
                      <span className="block normal-case text-ink-900">{item.productName}</span>
                      <span className="block font-normal normal-case tracking-normal text-steel-500">
                        {formatNumber(item.quantity, locale)} {item.unit}
                      </span>
                    </th>
                    {shown.map((q) => {
                      const line = q.items.find((i) => i.rfqItemId === item.id);
                      const prices = shown.map((qq) => qq.items.find((i) => i.rfqItemId === item.id)?.unitPrice).filter((v): v is number => typeof v === "number");
                      const best = prices.length ? Math.min(...prices) : null;
                      return (
                        <td key={q.id} className={cell}>
                          {line ? (
                            <div className={cn("inline-flex flex-col rounded px-2 py-1", best !== null && line.unitPrice === best && "bg-success-50 ring-1 ring-success-100")}>
                              <span className="font-medium tabular-nums text-ink-900">{formatMoney(line.unitPrice, q.currency, locale, { maxFractionDigits: 4 })}</span>
                              <span className="text-xs text-steel-500">
                                {formatNumber(line.quantity, locale)} {line.unit} · {formatMoney(line.total, q.currency, locale)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-steel-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              : null}

            <Row label={t("subtotal")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cn(cell, "tabular-nums")}>
                  {formatMoney(q.subtotal, q.currency, locale)}
                </td>
              ))}
            </Row>
            <Row label={t("shipping")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cn(cell, "tabular-nums")}>
                  {q.shippingCost > 0 ? formatMoney(q.shippingCost, q.currency, locale) : t("included")}
                </td>
              ))}
            </Row>
            {shown.some((q) => q.discount > 0) ? (
              <Row label={t("discount")} rowLabel={rowLabel}>
                {shown.map((q) => (
                  <td key={q.id} className={cn(cell, "tabular-nums")}>
                    {q.discount > 0 ? `− ${formatMoney(q.discount, q.currency, locale)}` : "—"}
                  </td>
                ))}
              </Row>
            ) : null}
            <Row label={t("total")} rowLabel={rowLabel} strong>
              {shown.map((q) => (
                <td key={q.id} className={cn(cell, "tabular-nums")}>
                  <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-1 font-display text-lg font-semibold", bestTotal !== null && q.total === bestTotal ? "bg-success-50 text-success-700 ring-1 ring-success-100" : "text-ink-900")}>
                    {formatMoney(q.total, q.currency, locale)}
                    {bestTotal !== null && q.total === bestTotal ? <Award className="size-4" aria-label={t("bestPrice")} /> : null}
                  </span>
                </td>
              ))}
            </Row>
            <Row label={t("moq")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.moq ? formatNumber(q.moq, locale) : "—"}
                </td>
              ))}
            </Row>
            <Row label={t("leadTime")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.leadTimeDays ? (
                    <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-1", bestLead !== null && q.leadTimeDays === bestLead && "bg-info-50 text-info-700 ring-1 ring-info-100")}>
                      {t("days", { n: q.leadTimeDays })}
                      {bestLead !== null && q.leadTimeDays === bestLead ? <Timer className="size-4" aria-label={t("fastest")} /> : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </Row>
            <Row label={t("incoterm")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.incoterm ?? "—"}
                </td>
              ))}
            </Row>
            <Row label={t("paymentTerms")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.paymentTerms ?? "—"}
                </td>
              ))}
            </Row>
            <Row label={t("validUntil")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.validUntil ? formatDate(q.validUntil, locale) : "—"}
                </td>
              ))}
            </Row>
            <Row label={t("sample")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  {q.sampleAvailable ? (q.samplePrice ? t("sampleFor", { price: formatMoney(q.samplePrice, q.currency, locale) }) : t("sampleYes")) : t("sampleNo")}
                </td>
              ))}
            </Row>
            {shown.some((q) => q.notes) ? (
              <Row label={t("supplierNotes")} rowLabel={rowLabel}>
                {shown.map((q) => (
                  <td key={q.id} className={cn(cell, "text-steel-600")}>
                    {q.notes ?? "—"}
                  </td>
                ))}
              </Row>
            ) : null}
            <Row label={t("yourNotes")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cell}>
                  <BuyerNotes quotationId={q.id} initial={q.buyerNotes ?? ""} placeholder={t("yourNotesPlaceholder")} saveLabel={t("saveNotes")} />
                </td>
              ))}
            </Row>
            <Row label={t("decision")} rowLabel={rowLabel}>
              {shown.map((q) => (
                <td key={q.id} className={cn(cell, "space-y-2")}>
                  <QuotationActions quotation={q} rfqId={rfqId} rfqStatus={rfqStatus} locale={locale} defaultAddress={defaultAddress} tradeAssuranceDefault={tradeAssuranceDefault} countries={countries} />
                </td>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, rowLabel, strong, children }: { label: string; rowLabel: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <tr className={cn(strong && "bg-steel-50/40")}>
      <th scope="row" className={rowLabel}>
        {label}
      </th>
      {children}
    </tr>
  );
}

function BuyerNotes({ quotationId, initial, placeholder, saveLabel }: { quotationId: string; initial: string; placeholder: string; saveLabel: string }) {
  const [value, setValue] = React.useState(initial);
  const { formAction, pending } = useActionForm(saveBuyerNotesAction);
  const dirty = value !== initial;
  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="quotationId" value={quotationId} />
      <Textarea name="buyerNotes" rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="text-xs" />
      {dirty ? (
        <Button type="submit" variant="ghost" size="xs" loading={pending}>
          {saveLabel}
        </Button>
      ) : null}
    </form>
  );
}

export function QuotationActions({
  quotation: q,
  rfqId,
  rfqStatus,
  locale,
  defaultAddress,
  tradeAssuranceDefault,
  countries,
}: {
  quotation: ComparisonQuotation;
  rfqId: string;
  rfqStatus: string;
  locale: string;
  defaultAddress: { company?: string; contactName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; countryCode?: string };
  tradeAssuranceDefault: boolean;
  countries: Array<{ code: string; name: string }>;
}) {
  const t = useTranslations("rfq.compare");
  const canAct = ACTIONABLE.includes(q.status) && rfqStatus === "OPEN";

  if (q.status === "ACCEPTED") {
    return (
      <div className="space-y-2">
        <Badge variant="success">
          <Check className="size-3" /> {t("awarded")}
        </Badge>
        <Button href={`/buyer/orders`} variant="secondary" size="xs" className="w-full">
          {t("viewOrder")}
        </Button>
      </div>
    );
  }
  if (!canAct) {
    return <p className="text-xs text-steel-500">{t("noActions")}</p>;
  }

  return (
    <div className="space-y-2">
      <DialogForm
        action={acceptQuotationAction}
        hidden={{ quotationId: q.id }}
        title={t("acceptTitle", { supplier: q.supplier.name })}
        description={t("acceptDescription", { total: formatMoney(q.total, q.currency, locale) })}
        submitLabel={t("acceptSubmit")}
        size="lg"
        redirectTo={(data) => `/buyer/orders/${data.orderId}`}
        trigger={(open) => (
          <Button type="button" variant="primary" size="sm" className="w-full" onClick={open}>
            <Check /> {t("accept")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <div className="space-y-4">
            <div className="rounded-md border border-brass-200 bg-brass-50 px-3 py-2.5">
              <Checkbox name="tradeAssurance" defaultChecked={tradeAssuranceDefault} label={t("tradeAssurance")} description={t("tradeAssuranceHint")} />
            </div>
            <p className="text-sm font-medium text-ink-900">{t("shippingAddress")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("addrCompany")} htmlFor={`company-${q.id}`} error={fieldError("company")}>
                <Input id={`company-${q.id}`} name="company" defaultValue={defaultAddress.company ?? ""} />
              </Field>
              <Field label={t("addrContact")} htmlFor={`contactName-${q.id}`} error={fieldError("contactName")}>
                <Input id={`contactName-${q.id}`} name="contactName" defaultValue={defaultAddress.contactName ?? ""} />
              </Field>
              <Field label={t("addrPhone")} htmlFor={`phone-${q.id}`} error={fieldError("phone")}>
                <Input id={`phone-${q.id}`} name="phone" defaultValue={defaultAddress.phone ?? ""} />
              </Field>
              <Field label={t("addrPostal")} htmlFor={`postalCode-${q.id}`} error={fieldError("postalCode")}>
                <Input id={`postalCode-${q.id}`} name="postalCode" defaultValue={defaultAddress.postalCode ?? ""} />
              </Field>
              <Field label={t("addrLine1")} htmlFor={`line1-${q.id}`} error={fieldError("line1")} required className="sm:col-span-2">
                <Input id={`line1-${q.id}`} name="line1" defaultValue={defaultAddress.line1 ?? ""} required />
              </Field>
              <Field label={t("addrLine2")} htmlFor={`line2-${q.id}`} error={fieldError("line2")} className="sm:col-span-2">
                <Input id={`line2-${q.id}`} name="line2" defaultValue={defaultAddress.line2 ?? ""} />
              </Field>
              <Field label={t("addrCity")} htmlFor={`city-${q.id}`} error={fieldError("city")} required>
                <Input id={`city-${q.id}`} name="city" defaultValue={defaultAddress.city ?? ""} required />
              </Field>
              <Field label={t("addrCountry")} htmlFor={`countryCode-${q.id}`} error={fieldError("countryCode")} required>
                <select
                  id={`countryCode-${q.id}`}
                  name="countryCode"
                  defaultValue={defaultAddress.countryCode ?? ""}
                  required
                  className="flex h-10 w-full rounded-md border border-steel-300 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100"
                >
                  <option value="">—</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("orderNotes")} htmlFor={`buyerNotes-${q.id}`} error={fieldError("buyerNotes")}>
              <Textarea id={`buyerNotes-${q.id}`} name="buyerNotes" rows={3} placeholder={t("orderNotesPlaceholder")} />
            </Field>
          </div>
        )}
      </DialogForm>

      <DialogForm
        action={requestRevisionAction}
        hidden={{ quotationId: q.id }}
        title={t("revisionTitle")}
        description={t("revisionDescription", { supplier: q.supplier.name })}
        submitLabel={t("revisionSubmit")}
        trigger={(open) => (
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={open}>
            <RefreshCw /> {t("revision2")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("revisionMessage")} htmlFor={`revision-${q.id}`} error={fieldError("message")} required>
            <Textarea id={`revision-${q.id}`} name="message" rows={4} placeholder={t("revisionPlaceholder")} required />
          </Field>
        )}
      </DialogForm>

      <Button href={`/buyer/messages/new?supplier=${q.supplier.slug}&rfq=${rfqId}`} variant="ghost" size="sm" className="w-full">
        <MessageSquare /> {t("negotiate")}
      </Button>

      <DialogForm
        action={rejectQuotationAction}
        hidden={{ quotationId: q.id }}
        title={t("rejectTitle")}
        description={t("rejectDescription", { supplier: q.supplier.name })}
        submitLabel={t("rejectSubmit")}
        submitVariant="danger"
        trigger={(open) => (
          <Button type="button" variant="ghost" size="sm" className="w-full text-danger-600 hover:bg-danger-50" onClick={open}>
            <X /> {t("reject")}
          </Button>
        )}
      >
        {({ fieldError }) => (
          <Field label={t("rejectReason")} htmlFor={`reject-${q.id}`} error={fieldError("reason")} required hint={t("rejectReasonHint")}>
            <Textarea id={`reject-${q.id}`} name="reason" rows={3} required />
          </Field>
        )}
      </DialogForm>
    </div>
  );
}
