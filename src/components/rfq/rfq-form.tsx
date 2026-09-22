"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload, type UploadedDocument } from "@/components/buyer/file-upload";
import { Badge, Button, Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SubmitButton, Textarea, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";
import { INCOTERMS, RFQ_CURRENCIES, RFQ_UNITS } from "@/modules/rfq/schemas";

export type CategoryOption = { id: string; name: string; nameVi: string | null; slug: string; level: number; parentId: string | null; path: string | null };
export type CountryOption = { code: string; name: string };
export type SupplierOption = { id: string; name: string; slug: string; verificationStatus: string; city: string | null };

export type RfqLineItem = { productName: string; specifications: string; quantity: string; unit: string; targetPrice: string };

export type RfqFormDefaults = {
  title?: string;
  categoryId?: string | null;
  description?: string;
  quantity?: number | string;
  unit?: string;
  targetPrice?: number | string | null;
  targetCurrency?: string;
  destinationCountryCode?: string | null;
  destinationCity?: string | null;
  incoterm?: string | null;
  preferredPaymentTerms?: string | null;
  quoteDeadline?: string | null;
  requiredDeliveryDate?: string | null;
  certificationRequirements?: string | null;
  customizationRequirements?: string | null;
  packagingRequirements?: string | null;
  sampleRequired?: boolean;
  visibility?: string;
  items?: RfqLineItem[];
  documents?: UploadedDocument[];
  invitedSupplierIds?: string[];
};

type ActionFn = (prev: ActionResult<{ id: string; matched: number; published: boolean }> | null, formData: FormData) => Promise<ActionResult<{ id: string; matched: number; published: boolean }>>;

const emptyItem = (): RfqLineItem => ({ productName: "", specifications: "", quantity: "", unit: "pieces", targetPrice: "" });

function Section({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">{step}</span>
          <div>
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
            {description ? <p className="mt-0.5 text-sm text-steel-500">{description}</p> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function RfqForm({
  action,
  categories,
  countries,
  suppliers,
  defaults = {},
  rfqId,
  locale,
}: {
  action: ActionFn;
  categories: CategoryOption[];
  countries: CountryOption[];
  suppliers: SupplierOption[];
  defaults?: RfqFormDefaults;
  rfqId?: string;
  locale: string;
}) {
  const t = useTranslations("rfq.form");
  const router = useRouter();
  const [items, setItems] = React.useState<RfqLineItem[]>(defaults.items?.length ? defaults.items : []);
  const [invited, setInvited] = React.useState<string[]>(defaults.invitedSupplierIds ?? []);
  const [supplierQuery, setSupplierQuery] = React.useState("");
  const intentRef = React.useRef<HTMLInputElement>(null);

  const { state, formAction, fieldError } = useActionForm(action, {
    onSuccess: (data) => router.push(`/buyer/rfqs/${data.id}`),
  });

  const categoryLabel = (c: CategoryOption) => `${"— ".repeat(Math.max(0, c.level))}${locale === "vi" && c.nameVi ? c.nameVi : c.name}`;
  const filteredSuppliers = React.useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    const selected = suppliers.filter((s) => invited.includes(s.id));
    if (!q) return selected.concat(suppliers.filter((s) => !invited.includes(s.id)).slice(0, 12));
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q)).slice(0, 25);
  }, [suppliers, supplierQuery, invited]);

  const setItem = (i: number, patch: Partial<RfqLineItem>) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <form action={formAction} className="space-y-5">
      {rfqId ? <input type="hidden" name="rfqId" value={rfqId} /> : null}
      <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />
      <input type="hidden" name="itemsJson" value={JSON.stringify(items.filter((i) => i.productName.trim() && i.quantity))} />
      {invited.map((id) => (
        <input key={id} type="hidden" name="invitedSupplierIds[]" value={id} />
      ))}

      <Section step={1} title={t("basics")} description={t("basicsHint")}>
        <Field label={t("title")} htmlFor="title" error={fieldError("title")} required hint={t("titleHint")}>
          <Input id="title" name="title" defaultValue={defaults.title} placeholder={t("titlePlaceholder")} maxLength={200} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("category")} htmlFor="categoryId" error={fieldError("categoryId")} hint={t("categoryHint")}>
            <Select id="categoryId" name="categoryId" defaultValue={defaults.categoryId ?? ""}>
              <option value="">{t("categoryNone")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("visibility")} htmlFor="visibility" error={fieldError("visibility")} hint={t("visibilityHint")}>
            <Select id="visibility" name="visibility" defaultValue={defaults.visibility ?? "PUBLIC"}>
              <option value="PUBLIC">{t("visibilityPublic")}</option>
              <option value="INVITED_ONLY">{t("visibilityInvited")}</option>
            </Select>
          </Field>
        </div>
        <Field label={t("description")} htmlFor="description" error={fieldError("description")} required hint={t("descriptionHint")}>
          <Textarea id="description" name="description" defaultValue={defaults.description} rows={6} placeholder={t("descriptionPlaceholder")} required />
        </Field>
      </Section>

      <Section step={2} title={t("quantityPrice")} description={t("quantityPriceHint")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("quantity")} htmlFor="quantity" error={fieldError("quantity")} required>
            <Input id="quantity" name="quantity" type="number" min={1} step={1} defaultValue={defaults.quantity ?? ""} required />
          </Field>
          <Field label={t("unit")} htmlFor="unit" error={fieldError("unit")} required>
            <Select id="unit" name="unit" defaultValue={defaults.unit ?? "pieces"}>
              {RFQ_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("targetPrice")} htmlFor="targetPrice" error={fieldError("targetPrice")} hint={t("targetPriceHint")}>
            <Input id="targetPrice" name="targetPrice" inputMode="decimal" defaultValue={defaults.targetPrice ?? ""} placeholder="0.00" />
          </Field>
          <Field label={t("currency")} htmlFor="targetCurrency" error={fieldError("targetCurrency")}>
            <Select id="targetCurrency" name="targetCurrency" defaultValue={defaults.targetCurrency ?? "USD"}>
              {RFQ_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section step={3} title={t("delivery")} description={t("deliveryHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("destinationCountry")} htmlFor="destinationCountryCode" error={fieldError("destinationCountryCode")}>
            <Select id="destinationCountryCode" name="destinationCountryCode" defaultValue={defaults.destinationCountryCode ?? ""}>
              <option value="">{t("selectCountry")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("destinationCity")} htmlFor="destinationCity" error={fieldError("destinationCity")}>
            <Input id="destinationCity" name="destinationCity" defaultValue={defaults.destinationCity ?? ""} placeholder={t("destinationCityPlaceholder")} />
          </Field>
          <Field label={t("incoterm")} htmlFor="incoterm" error={fieldError("incoterm")} hint={t("incotermHint")}>
            <Select id="incoterm" name="incoterm" defaultValue={defaults.incoterm ?? ""}>
              <option value="">{t("incotermNone")}</option>
              {INCOTERMS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("paymentTerms")} htmlFor="preferredPaymentTerms" error={fieldError("preferredPaymentTerms")} hint={t("paymentTermsHint")}>
            <Input id="preferredPaymentTerms" name="preferredPaymentTerms" defaultValue={defaults.preferredPaymentTerms ?? ""} placeholder={t("paymentTermsPlaceholder")} />
          </Field>
          <Field label={t("quoteDeadline")} htmlFor="quoteDeadline" error={fieldError("quoteDeadline")} hint={t("quoteDeadlineHint")}>
            <Input id="quoteDeadline" name="quoteDeadline" type="date" defaultValue={defaults.quoteDeadline ?? ""} />
          </Field>
          <Field label={t("requiredDelivery")} htmlFor="requiredDeliveryDate" error={fieldError("requiredDeliveryDate")}>
            <Input id="requiredDeliveryDate" name="requiredDeliveryDate" type="date" defaultValue={defaults.requiredDeliveryDate ?? ""} />
          </Field>
        </div>
      </Section>

      <Section step={4} title={t("requirements")} description={t("requirementsHint")}>
        <Field label={t("certifications")} htmlFor="certificationRequirements" error={fieldError("certificationRequirements")} hint={t("certificationsHint")}>
          <Textarea id="certificationRequirements" name="certificationRequirements" rows={3} defaultValue={defaults.certificationRequirements ?? ""} placeholder={t("certificationsPlaceholder")} />
        </Field>
        <Field label={t("customization")} htmlFor="customizationRequirements" error={fieldError("customizationRequirements")}>
          <Textarea id="customizationRequirements" name="customizationRequirements" rows={3} defaultValue={defaults.customizationRequirements ?? ""} placeholder={t("customizationPlaceholder")} />
        </Field>
        <Field label={t("packaging")} htmlFor="packagingRequirements" error={fieldError("packagingRequirements")}>
          <Textarea id="packagingRequirements" name="packagingRequirements" rows={3} defaultValue={defaults.packagingRequirements ?? ""} placeholder={t("packagingPlaceholder")} />
        </Field>
        <Checkbox name="sampleRequired" defaultChecked={defaults.sampleRequired} label={t("sampleRequired")} description={t("sampleRequiredHint")} />
      </Section>

      <Section step={5} title={t("lineItems")} description={t("lineItemsHint")}>
        {items.length === 0 ? (
          <p className="text-sm text-steel-500">{t("lineItemsEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-md border border-steel-200 bg-steel-50/50 p-3">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="text-xs font-medium text-steel-600" htmlFor={`item-name-${i}`}>
                      {t("itemName")}
                    </label>
                    <Input id={`item-name-${i}`} value={item.productName} onChange={(e) => setItem(i, { productName: e.target.value })} placeholder={t("itemNamePlaceholder")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-steel-600" htmlFor={`item-qty-${i}`}>
                      {t("quantity")}
                    </label>
                    <Input id={`item-qty-${i}`} type="number" min={1} value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-steel-600" htmlFor={`item-unit-${i}`}>
                      {t("unit")}
                    </label>
                    <Select id={`item-unit-${i}`} value={item.unit} onChange={(e) => setItem(i, { unit: e.target.value })}>
                      {RFQ_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t(`units.${u}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-steel-600" htmlFor={`item-price-${i}`}>
                      {t("targetPrice")}
                    </label>
                    <Input id={`item-price-${i}`} inputMode="decimal" value={item.targetPrice} onChange={(e) => setItem(i, { targetPrice: e.target.value })} />
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label={t("removeItem")}>
                      <Trash2 className="text-danger-600" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs font-medium text-steel-600" htmlFor={`item-spec-${i}`}>
                    {t("itemSpecs")}
                  </label>
                  <Textarea id={`item-spec-${i}`} rows={2} value={item.specifications} onChange={(e) => setItem(i, { specifications: e.target.value })} placeholder={t("itemSpecsPlaceholder")} />
                </div>
              </div>
            ))}
          </div>
        )}
        {fieldError("itemsJson") ? (
          <p className="text-xs text-danger-600" role="alert">
            {fieldError("itemsJson")}
          </p>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => setItems([...items, emptyItem()])}>
          <Plus /> {t("addItem")}
        </Button>
      </Section>

      <Section step={6} title={t("attachments")} description={t("attachmentsHint")}>
        <FileUpload name="documentIds" scope="rfq" hint={t("attachmentsFormats")} initial={defaults.documents ?? []} max={8} />
      </Section>

      <Section step={7} title={t("inviteSuppliers")} description={t("inviteSuppliersHint")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-400" />
          <Input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder={t("searchSuppliers")} className="pl-9" aria-label={t("searchSuppliers")} />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-steel-200 p-1">
          {filteredSuppliers.length === 0 ? (
            <p className="p-3 text-sm text-steel-500">{t("noSuppliers")}</p>
          ) : (
            filteredSuppliers.map((s) => {
              const checked = invited.includes(s.id);
              return (
                <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-steel-50", checked && "bg-ink-50")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-steel-300 text-ink-900 focus:ring-brass-400"
                    checked={checked}
                    onChange={() => setInvited(checked ? invited.filter((x) => x !== s.id) : [...invited, s.id])}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{s.name}</span>
                  {s.city ? <span className="shrink-0 text-xs text-steel-500">{s.city}</span> : null}
                  {s.verificationStatus === "VERIFIED" ? (
                    <Badge variant="success" size="sm">
                      {t("verified")}
                    </Badge>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
        {invited.length ? <p className="text-xs text-steel-500">{t("invitedCount", { count: invited.length })}</p> : null}
      </Section>

      <FormError state={state} />

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-steel-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <p className="mr-auto text-xs text-steel-500">{t("footerHint")}</p>
        <SubmitButton variant="secondary" onClick={() => intentRef.current && (intentRef.current.value = "draft")}>
          {t("saveDraft")}
        </SubmitButton>
        <SubmitButton variant="primary" onClick={() => intentRef.current && (intentRef.current.value = "publish")}>
          {t("publish")}
        </SubmitButton>
      </div>
    </form>
  );
}
