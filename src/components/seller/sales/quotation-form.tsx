"use client";

import { Plus, Save, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload, type UploadedDocument } from "@/components/buyer/file-upload";
import { Alert, Button, Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, Textarea, useActionForm } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/utils";
import { INCOTERMS, RFQ_CURRENCIES } from "@/modules/rfq/schemas";
import { reviseQuotationAction, saveQuotationDraftAction, submitQuotationAction } from "@/modules/seller/sales/quotations/actions";

export type QuoteRfqItem = { id: string; productName: string; specifications: string | null; quantity: number; unit: string; targetPrice: number | null };

export type QuotationFormDefaults = {
  currency: string;
  incoterm: string | null;
  validityDays: number;
  paymentTerms: string | null;
  shippingCost: number | null;
  discount: number | null;
  shippingMethod: string | null;
  moq: number | null;
  leadTimeDays: number | null;
  productionTimeNote: string | null;
  sampleAvailable: boolean;
  samplePrice: number | null;
  notes: string | null;
  items: Array<{ rfqItemId: string | null; description: string; quantity: number; unit: string; unitPrice: number | null; notes: string | null }>;
  documents: UploadedDocument[];
};

type Row = { key: string; rfqItemId: string | null; description: string; quantity: string; unit: string; unitPrice: string; notes: string; fromRfq: boolean };

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

let seq = 0;
const nextKey = () => `row-${++seq}-${Math.random().toString(36).slice(2, 7)}`;

export function QuotationForm({
  mode,
  locale,
  rfq,
  quotationId,
  defaults,
  targetCurrency,
}: {
  mode: "new" | "draft" | "revise";
  locale: string;
  rfq: { id: string; rfqNumber: string; title: string; quantity: number; unit: string; items: QuoteRfqItem[]; sampleRequired: boolean };
  quotationId: string | null;
  defaults: QuotationFormDefaults;
  targetCurrency: string;
}) {
  const t = useTranslations("sales.quotationForm");
  const [intent, setIntent] = React.useState<"draft" | "submit" | "revise">(mode === "revise" ? "revise" : "submit");
  const draft = useActionForm(saveQuotationDraftAction);
  const submit = useActionForm(submitQuotationAction);
  const revise = useActionForm(reviseQuotationAction);
  const active = intent === "draft" ? draft : intent === "revise" ? revise : submit;

  const [rows, setRows] = React.useState<Row[]>(() =>
    defaults.items.length
      ? defaults.items.map((it) => ({
          key: nextKey(),
          rfqItemId: it.rfqItemId,
          description: it.description,
          quantity: String(it.quantity),
          unit: it.unit,
          unitPrice: it.unitPrice == null ? "" : String(it.unitPrice),
          notes: it.notes ?? "",
          fromRfq: !!it.rfqItemId,
        }))
      : rfq.items.length
        ? rfq.items.map((it) => ({ key: nextKey(), rfqItemId: it.id, description: it.productName, quantity: String(it.quantity), unit: it.unit, unitPrice: "", notes: "", fromRfq: true }))
        : [{ key: nextKey(), rfqItemId: null, description: rfq.title, quantity: String(rfq.quantity), unit: rfq.unit, unitPrice: "", notes: "", fromRfq: false }],
  );
  const [currency, setCurrency] = React.useState(defaults.currency || targetCurrency || "USD");
  const [shippingCost, setShippingCost] = React.useState(defaults.shippingCost == null ? "" : String(defaults.shippingCost));
  const [discount, setDiscount] = React.useState(defaults.discount == null ? "" : String(defaults.discount));
  const [sampleAvailable, setSampleAvailable] = React.useState(defaults.sampleAvailable);

  const subtotal = rows.reduce((s, r) => s + num(r.quantity) * num(r.unitPrice), 0);
  const total = subtotal + num(shippingCost) - num(discount);
  const targetByItem = new Map(rfq.items.map((i) => [i.id, i.targetPrice]));

  const updateRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const itemsJson = JSON.stringify(
    rows.map((r) => ({ rfqItemId: r.rfqItemId ?? undefined, description: r.description, quantity: num(r.quantity), unit: r.unit, unitPrice: num(r.unitPrice), notes: r.notes || undefined })),
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const chosen = (submitter?.value as "draft" | "submit" | "revise" | undefined) ?? (mode === "revise" ? "revise" : "submit");
    setIntent(chosen);
    const fd = new FormData(e.currentTarget, submitter ?? undefined);
    const dispatch = chosen === "draft" ? draft.formAction : chosen === "revise" ? revise.formAction : submit.formAction;
    React.startTransition(() => dispatch(fd));
  };
  const pending = draft.pending || submit.pending || revise.pending;
  const fieldError = active.fieldError;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="rfqId" value={rfq.id} />
      {quotationId ? <input type="hidden" name="quotationId" value={quotationId} /> : null}
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {mode === "revise" ? <Alert variant="info">{t("reviseHint")}</Alert> : null}

      <Card>
        <CardHeader title={t("items")} description={t("itemsHint")} />
        <CardContent className="space-y-3">
          {fieldError("itemsJson") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("itemsJson")}
            </p>
          ) : null}
          <div className="hidden grid-cols-[1fr_110px_110px_130px_130px_36px] gap-2 text-xs font-medium uppercase tracking-wide text-steel-500 md:grid">
            <span>{t("itemDescription")}</span>
            <span>{t("itemQuantity")}</span>
            <span>{t("itemUnit")}</span>
            <span>{t("itemUnitPrice", { currency })}</span>
            <span className="text-right">{t("itemTotal")}</span>
            <span />
          </div>
          {rows.map((r) => {
            const target = r.rfqItemId ? targetByItem.get(r.rfqItemId) : null;
            return (
              <div key={r.key} className="grid gap-2 rounded-lg border border-hairline p-3 md:grid-cols-[1fr_110px_110px_130px_130px_36px] md:items-start md:border-0 md:p-0">
                <div className="space-y-1.5">
                  <Input value={r.description} onChange={(e) => updateRow(r.key, { description: e.target.value })} placeholder={t("itemDescriptionPlaceholder")} aria-label={t("itemDescription")} />
                  <Input value={r.notes} onChange={(e) => updateRow(r.key, { notes: e.target.value })} placeholder={t("itemNotesPlaceholder")} aria-label={t("itemNotes")} className="h-8 text-xs" />
                  {target ? <p className="text-[11px] text-steel-500">{t("itemTargetHint", { price: formatMoney(target, targetCurrency, locale, { maxFractionDigits: 4 }) })}</p> : null}
                </div>
                <Input type="number" min={1} step={1} inputMode="numeric" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} aria-label={t("itemQuantity")} />
                <Input value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} aria-label={t("itemUnit")} />
                <Input type="number" min={0} step="0.0001" inputMode="decimal" value={r.unitPrice} onChange={(e) => updateRow(r.key, { unitPrice: e.target.value })} placeholder="0.00" aria-label={t("itemUnitPrice", { currency })} />
                <p className="self-center text-right text-sm font-medium tabular-nums text-ink-900 md:h-10 md:leading-10">{formatMoney(num(r.quantity) * num(r.unitPrice), currency, locale)}</p>
                <Button type="button" variant="ghost" size="icon" aria-label={t("removeItem")} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <Trash2 />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { key: nextKey(), rfqItemId: null, description: "", quantity: "1", unit: rfq.unit, unitPrice: "", notes: "", fromRfq: false }])}>
            <Plus /> {t("addItem")}
          </Button>

          <dl className="ml-auto max-w-sm space-y-2 border-t border-hairline pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-steel-600">{t("subtotal")}</dt>
              <dd className="tabular-nums text-ink-900">{formatMoney(subtotal, currency, locale)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-steel-600">{t("shippingCost")}</dt>
              <dd className="w-40">
                <Input name="shippingCost" type="number" min={0} step="0.01" inputMode="decimal" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0.00" aria-label={t("shippingCost")} className="h-9 text-right" />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-steel-600">{t("discount")}</dt>
              <dd className="w-40">
                <Input name="discount" type="number" min={0} step="0.01" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" aria-label={t("discount")} className="h-9 text-right" />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-hairline pt-2">
              <dt className="font-semibold text-ink-900">{t("total")}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums text-ink-900">{formatMoney(total, currency, locale)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("terms")} description={t("termsHint")} />
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("currency")} htmlFor="q-currency" error={fieldError("currency")} required>
            <Select id="q-currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("incoterm")} htmlFor="q-incoterm" error={fieldError("incoterm")}>
            <Select id="q-incoterm" name="incoterm" defaultValue={defaults.incoterm ?? ""}>
              <option value="">{t("incotermNone")}</option>
              {INCOTERMS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("validityDays")} htmlFor="q-validity" error={fieldError("validityDays")} hint={t("validityHint")} required>
            <Input id="q-validity" name="validityDays" type="number" min={1} max={365} defaultValue={defaults.validityDays} required />
          </Field>
          <Field label={t("leadTimeDays")} htmlFor="q-lead" error={fieldError("leadTimeDays")} hint={t("leadTimeHint")}>
            <Input id="q-lead" name="leadTimeDays" type="number" min={0} defaultValue={defaults.leadTimeDays ?? ""} />
          </Field>
          <Field label={t("moq")} htmlFor="q-moq" error={fieldError("moq")}>
            <Input id="q-moq" name="moq" type="number" min={0} defaultValue={defaults.moq ?? ""} />
          </Field>
          <Field label={t("shippingMethod")} htmlFor="q-shipping" error={fieldError("shippingMethod")}>
            <Input id="q-shipping" name="shippingMethod" defaultValue={defaults.shippingMethod ?? ""} placeholder={t("shippingMethodPlaceholder")} maxLength={120} />
          </Field>
          <Field label={t("paymentTerms")} htmlFor="q-payment" error={fieldError("paymentTerms")} hint={t("paymentTermsHint")} className="sm:col-span-2 lg:col-span-3">
            <Input id="q-payment" name="paymentTerms" defaultValue={defaults.paymentTerms ?? ""} placeholder={t("paymentTermsPlaceholder")} maxLength={200} />
          </Field>
          <Field label={t("productionNote")} htmlFor="q-production" error={fieldError("productionTimeNote")} className="sm:col-span-2 lg:col-span-3">
            <Input id="q-production" name="productionTimeNote" defaultValue={defaults.productionTimeNote ?? ""} placeholder={t("productionNotePlaceholder")} maxLength={500} />
          </Field>
          <div className="space-y-3 sm:col-span-2 lg:col-span-3">
            <Checkbox name="sampleAvailable" checked={sampleAvailable} onChange={(e) => setSampleAvailable(e.target.checked)} label={t("sampleAvailable")} description={rfq.sampleRequired ? t("sampleRequiredHint") : t("sampleHint")} />
            {sampleAvailable ? (
              <Field label={t("samplePrice", { currency })} htmlFor="q-sample-price" error={fieldError("samplePrice")} className="max-w-xs">
                <Input id="q-sample-price" name="samplePrice" type="number" min={0} step="0.01" defaultValue={defaults.samplePrice ?? ""} placeholder="0.00" />
              </Field>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("message")} description={t("messageHint")} />
        <CardContent className="space-y-4">
          <Field label={t("notes")} htmlFor="q-notes" error={fieldError("notes")}>
            <Textarea id="q-notes" name="notes" rows={5} defaultValue={defaults.notes ?? ""} placeholder={t("notesPlaceholder")} maxLength={4000} />
          </Field>
          <FileUpload name="documentIds" scope="quotation" visibility="COMPANY" label={t("attachments")} hint={t("attachmentsHint")} max={8} initial={defaults.documents} />
        </CardContent>
      </Card>

      <FormError state={active.state} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-steel-500">{t("summary", { items: formatNumber(rows.length, locale), total: formatMoney(total, currency, locale) })}</p>
        <div className="flex flex-wrap gap-2">
          {mode === "revise" ? (
            <Button type="submit" name="intent" value="revise" variant="primary" loading={pending}>
              <Send /> {t("sendRevision")}
            </Button>
          ) : (
            <>
              <Button type="submit" name="intent" value="draft" variant="secondary" loading={pending && intent === "draft"} disabled={pending}>
                <Save /> {t("saveDraft")}
              </Button>
              <Button type="submit" name="intent" value="submit" variant="primary" loading={pending && intent === "submit"} disabled={pending}>
                <Send /> {t("send")}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
