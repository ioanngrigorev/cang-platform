"use client";

import { ExternalLink, ImageIcon, Plus, Send, Star, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FileUpload, type UploadedDocument } from "@/components/buyer/file-upload";
import { Alert, Badge, Button, Card, CardContent, CardHeader, Checkbox, Field, FormError, Input, Select, SmartImage, StatusBadge, Textarea, useActionForm, useToast } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createProductAction, setPrimaryImageAction, updateProductAction } from "@/modules/seller/products/actions";
import { PRICE_TYPES, PRODUCT_CURRENCIES, PRODUCT_UNITS } from "@/modules/seller/products/schemas";
import { preservingSubmit } from "./preserving-submit";

export type ProductFormDefaults = {
  title: string;
  titleVi: string | null;
  categoryId: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  descriptionVi: string | null;
  priceType: string;
  currency: string;
  basePrice: number | null;
  unit: string;
  moq: number;
  leadTimeDays: number | null;
  leadTimeNote: string | null;
  hasSample: boolean;
  samplePrice: number | null;
  sampleLeadDays: number | null;
  customizable: boolean;
  oemAvailable: boolean;
  odmAvailable: boolean;
  packagingDetails: string | null;
  shippingInfo: string | null;
  hsCode: string | null;
  originCountry: string;
  brand: string | null;
  model: string | null;
  videoUrl: string | null;
  keywords: string[];
  tiers: Array<{ minQty: number; maxQty: number | null; price: number }>;
  variants: Array<{ name: string; sku: string | null; attributes: Record<string, string>; price: number | null; moq: number | null }>;
  specs: Array<{ name: string; value: string; unit: string | null }>;
  certificationIds: string[];
  images: Array<{ id: string; url: string }>;
  status: string;
  slug: string | null;
};

type TierRow = { minQty: string; maxQty: string; price: string };
type VariantRow = { name: string; sku: string; attributes: string; price: string; moq: string };
type SpecRow = { name: string; value: string; unit: string };

const attributesToText = (a: Record<string, string>) =>
  Object.entries(a)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

const textToAttributes = (s: string) => {
  const out: Record<string, string> = {};
  for (const part of s.split(/[;\n]/)) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim();
    const value = rest.join("=").trim();
    if (key && value) out[key] = value;
  }
  return out;
};

export function ProductForm({
  mode,
  productId,
  categories,
  certifications,
  countries,
  defaults,
  canPublish,
}: {
  mode: "create" | "edit";
  productId?: string;
  categories: Array<{ id: string; label: string; level: number }>;
  certifications: Array<{ id: string; name: string }>;
  countries: Array<{ code: string; name: string }>;
  defaults: ProductFormDefaults;
  canPublish: boolean;
}) {
  const t = useTranslations("seller.productForm");
  const router = useRouter();
  const { toast } = useToast();
  const action = mode === "create" ? createProductAction : updateProductAction;
  const { state, formAction, fieldError, pending } = useActionForm(action, { onSuccess: () => router.refresh() });

  const [priceType, setPriceType] = React.useState(defaults.priceType);
  const [hasSample, setHasSample] = React.useState(defaults.hasSample);
  const [tiers, setTiers] = React.useState<TierRow[]>(defaults.tiers.map((x) => ({ minQty: String(x.minQty), maxQty: x.maxQty == null ? "" : String(x.maxQty), price: String(x.price) })));
  const [variants, setVariants] = React.useState<VariantRow[]>(
    defaults.variants.map((v) => ({ name: v.name, sku: v.sku ?? "", attributes: attributesToText(v.attributes), price: v.price == null ? "" : String(v.price), moq: v.moq == null ? "" : String(v.moq) })),
  );
  const [specs, setSpecs] = React.useState<SpecRow[]>(defaults.specs.map((s) => ({ name: s.name, value: s.value, unit: s.unit ?? "" })));
  const [certs, setCerts] = React.useState<string[]>(defaults.certificationIds);
  const [images, setImages] = React.useState(defaults.images);
  const [newImages, setNewImages] = React.useState<UploadedDocument[]>([]);
  const [primaryPending, startPrimary] = React.useTransition();

  const tiersJson = JSON.stringify(
    tiers
      .filter((r) => r.minQty.trim() || r.price.trim())
      .map((r) => ({ minQty: Number(r.minQty), maxQty: r.maxQty.trim() ? Number(r.maxQty) : null, price: Number(r.price) })),
  );
  const variantsJson = JSON.stringify(
    variants
      .filter((v) => v.name.trim())
      .map((v) => ({ name: v.name.trim(), sku: v.sku.trim() || null, attributes: textToAttributes(v.attributes), price: v.price.trim() ? Number(v.price) : null, moq: v.moq.trim() ? Number(v.moq) : null })),
  );
  const specsJson = JSON.stringify(specs.filter((s) => s.name.trim() && s.value.trim()).map((s) => ({ name: s.name.trim(), value: s.value.trim(), unit: s.unit.trim() || null })));

  const isLive = defaults.status === "ACTIVE";
  const isPending = defaults.status === "PENDING_REVIEW";
  const showPrice = priceType !== "CONTACT";
  const totalImages = images.length + newImages.length;

  function makePrimary(imageId: string) {
    if (!productId) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("imageId", imageId);
    startPrimary(async () => {
      const res = await setPrimaryImageAction(null, fd);
      if (res.ok) {
        setImages((list) => {
          const target = list.find((i) => i.id === imageId);
          return target ? [target, ...list.filter((i) => i.id !== imageId)] : list;
        });
        toast({ title: res.message ?? t("images.primarySet"), variant: "success" });
      } else {
        toast({ title: res.error, variant: "error" });
      }
    });
  }

  const cell = "h-9 text-sm";

  return (
    <form action={formAction} onSubmit={preservingSubmit(formAction)} className="space-y-5">
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <input type="hidden" name="tiersJson" value={tiersJson} />
      <input type="hidden" name="variantsJson" value={variantsJson} />
      <input type="hidden" name="specsJson" value={specsJson} />
      {certs.map((c) => (
        <input key={c} type="hidden" name="certificationIds[]" value={c} />
      ))}
      {images.map((i) => (
        <input key={i.id} type="hidden" name="keepImageIds[]" value={i.id} />
      ))}

      {defaults.status === "REJECTED" ? (
        <Alert variant="danger" title={t("rejectedTitle")}>
          {t("rejectedBody")}
        </Alert>
      ) : null}

      <Card>
        <CardHeader title={t("basics")} description={t("basicsHint")} />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("title")} htmlFor="title" error={fieldError("title")} required>
              <Input id="title" name="title" defaultValue={defaults.title} required maxLength={200} placeholder={t("titlePlaceholder")} />
            </Field>
            <Field label={t("titleVi")} htmlFor="titleVi" error={fieldError("titleVi")}>
              <Input id="titleVi" name="titleVi" defaultValue={defaults.titleVi ?? ""} maxLength={200} />
            </Field>
            <Field label={t("category")} htmlFor="categoryId" error={fieldError("categoryId")} required>
              <Select id="categoryId" name="categoryId" defaultValue={defaults.categoryId} required>
                <option value="">{t("categoryNone")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${"  ".repeat(c.level)}${c.level > 0 ? "└ " : ""}${c.label}`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("sku")} htmlFor="sku" error={fieldError("sku")}>
              <Input id="sku" name="sku" defaultValue={defaults.sku ?? ""} maxLength={80} />
            </Field>
            <Field label={t("brand")} htmlFor="brand" error={fieldError("brand")}>
              <Input id="brand" name="brand" defaultValue={defaults.brand ?? ""} maxLength={120} />
            </Field>
            <Field label={t("model")} htmlFor="model" error={fieldError("model")}>
              <Input id="model" name="model" defaultValue={defaults.model ?? ""} maxLength={120} />
            </Field>
          </div>
          <Field label={t("shortDescription")} htmlFor="shortDescription" error={fieldError("shortDescription")} hint={t("shortDescriptionHint")}>
            <Input id="shortDescription" name="shortDescription" defaultValue={defaults.shortDescription ?? ""} maxLength={400} />
          </Field>
          <Field label={t("description")} htmlFor="description" error={fieldError("description")} hint={t("descriptionHint")}>
            <Textarea id="description" name="description" rows={7} defaultValue={defaults.description ?? ""} />
          </Field>
          <Field label={t("descriptionVi")} htmlFor="descriptionVi" error={fieldError("descriptionVi")}>
            <Textarea id="descriptionVi" name="descriptionVi" rows={5} defaultValue={defaults.descriptionVi ?? ""} />
          </Field>
          <Field label={t("keywords")} htmlFor="keywords" error={fieldError("keywords")} hint={t("keywordsHint")}>
            <Input id="keywords" name="keywords" defaultValue={defaults.keywords.join(", ")} maxLength={1000} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("pricing")} description={t("pricingHint")} />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("priceType")} htmlFor="priceType" error={fieldError("priceType")} required>
              <Select id="priceType" name="priceType" value={priceType} onChange={(e) => setPriceType(e.target.value)}>
                {PRICE_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {t(`priceTypes.${p}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("currency")} htmlFor="currency" error={fieldError("currency")}>
              <Select id="currency" name="currency" defaultValue={defaults.currency}>
                {PRODUCT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={priceType === "TIERED" ? t("basePriceReference") : t("basePrice")} htmlFor="basePrice" error={fieldError("basePrice")} required={priceType === "FIXED"} className={showPrice ? undefined : "hidden"}>
              <Input id="basePrice" name="basePrice" inputMode="decimal" defaultValue={defaults.basePrice ?? ""} placeholder="0.00" />
            </Field>
            <Field label={t("unit")} htmlFor="unit" error={fieldError("unit")} required>
              <Select id="unit" name="unit" defaultValue={defaults.unit}>
                {PRODUCT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("moq")} htmlFor="moq" error={fieldError("moq")} required>
              <Input id="moq" name="moq" type="number" min={1} step={1} defaultValue={defaults.moq} required />
            </Field>
          </div>

          {priceType === "TIERED" ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{t("tiers")}</p>
                <Button type="button" variant="secondary" size="xs" onClick={() => setTiers([...tiers, { minQty: "", maxQty: "", price: "" }])}>
                  <Plus /> {t("addTier")}
                </Button>
              </div>
              {fieldError("tiersJson") ? (
                <p className="mb-2 text-xs text-danger-600" role="alert">
                  {fieldError("tiersJson")}
                </p>
              ) : null}
              {tiers.length === 0 ? (
                <p className="text-xs text-steel-500">{t("noTiers")}</p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium uppercase tracking-wide text-steel-500 sm:grid">
                    <span>{t("tierMin")}</span>
                    <span>{t("tierMax")}</span>
                    <span>{t("tierPrice")}</span>
                    <span className="w-8" />
                  </div>
                  {tiers.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                      <Input className={cell} type="number" min={1} placeholder={t("tierMin")} value={row.minQty} onChange={(e) => setTiers(tiers.map((r, j) => (j === i ? { ...r, minQty: e.target.value } : r)))} aria-label={t("tierMin")} />
                      <Input className={cell} type="number" min={1} placeholder={t("tierMaxPlaceholder")} value={row.maxQty} onChange={(e) => setTiers(tiers.map((r, j) => (j === i ? { ...r, maxQty: e.target.value } : r)))} aria-label={t("tierMax")} />
                      <Input className={cell} inputMode="decimal" placeholder="0.00" value={row.price} onChange={(e) => setTiers(tiers.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))} aria-label={t("tierPrice")} />
                      <button type="button" className="rounded p-2 text-steel-400 hover:bg-steel-100 hover:text-danger-600" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} aria-label={t("removeRow")}>
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("production")} />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("leadTimeDays")} htmlFor="leadTimeDays" error={fieldError("leadTimeDays")}>
              <Input id="leadTimeDays" name="leadTimeDays" type="number" min={0} defaultValue={defaults.leadTimeDays ?? ""} />
            </Field>
            <Field label={t("leadTimeNote")} htmlFor="leadTimeNote" error={fieldError("leadTimeNote")} className="lg:col-span-2">
              <Input id="leadTimeNote" name="leadTimeNote" defaultValue={defaults.leadTimeNote ?? ""} placeholder={t("leadTimeNotePlaceholder")} maxLength={300} />
            </Field>
            <Field label={t("originCountry")} htmlFor="originCountry" error={fieldError("originCountry")} required>
              <Select id="originCountry" name="originCountry" defaultValue={defaults.originCountry}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("hsCode")} htmlFor="hsCode" error={fieldError("hsCode")}>
              <Input id="hsCode" name="hsCode" defaultValue={defaults.hsCode ?? ""} maxLength={20} placeholder="4202.92" />
            </Field>
            <Field label={t("videoUrl")} htmlFor="videoUrl" error={fieldError("videoUrl")}>
              <Input id="videoUrl" name="videoUrl" defaultValue={defaults.videoUrl ?? ""} placeholder="https://" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Checkbox name="customizable" defaultChecked={defaults.customizable} label={t("customizable")} description={t("customizableHint")} />
            <Checkbox name="oemAvailable" defaultChecked={defaults.oemAvailable} label={t("oemAvailable")} description={t("oemHint")} />
            <Checkbox name="odmAvailable" defaultChecked={defaults.odmAvailable} label={t("odmAvailable")} description={t("odmHint")} />
          </div>
          <div className="rounded-md border border-steel-200 p-4">
            <Checkbox name="hasSample" checked={hasSample} onChange={(e) => setHasSample(e.target.checked)} label={t("hasSample")} description={t("hasSampleHint")} />
            {hasSample ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label={t("samplePrice")} htmlFor="samplePrice" error={fieldError("samplePrice")}>
                  <Input id="samplePrice" name="samplePrice" inputMode="decimal" defaultValue={defaults.samplePrice ?? ""} placeholder="0.00" />
                </Field>
                <Field label={t("sampleLeadDays")} htmlFor="sampleLeadDays" error={fieldError("sampleLeadDays")}>
                  <Input id="sampleLeadDays" name="sampleLeadDays" type="number" min={0} defaultValue={defaults.sampleLeadDays ?? ""} />
                </Field>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("packagingDetails")} htmlFor="packagingDetails" error={fieldError("packagingDetails")}>
              <Textarea id="packagingDetails" name="packagingDetails" rows={3} defaultValue={defaults.packagingDetails ?? ""} placeholder={t("packagingPlaceholder")} />
            </Field>
            <Field label={t("shippingInfo")} htmlFor="shippingInfo" error={fieldError("shippingInfo")}>
              <Textarea id="shippingInfo" name="shippingInfo" rows={3} defaultValue={defaults.shippingInfo ?? ""} placeholder={t("shippingPlaceholder")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={t("variants")}
          description={t("variantsHint")}
          action={
            <Button type="button" variant="secondary" size="xs" onClick={() => setVariants([...variants, { name: "", sku: "", attributes: "", price: "", moq: "" }])}>
              <Plus /> {t("addVariant")}
            </Button>
          }
        />
        <CardContent className="space-y-2">
          {fieldError("variantsJson") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("variantsJson")}
            </p>
          ) : null}
          {variants.length === 0 ? (
            <p className="text-xs text-steel-500">{t("noVariants")}</p>
          ) : (
            <>
              <div className="hidden grid-cols-[1.2fr_0.8fr_2fr_0.8fr_0.7fr_auto] gap-2 text-xs font-medium uppercase tracking-wide text-steel-500 lg:grid">
                <span>{t("variantName")}</span>
                <span>{t("sku")}</span>
                <span>{t("variantAttributes")}</span>
                <span>{t("variantPrice")}</span>
                <span>{t("moq")}</span>
                <span className="w-8" />
              </div>
              {variants.map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-steel-200 p-2 lg:grid-cols-[1.2fr_0.8fr_2fr_0.8fr_0.7fr_auto] lg:border-0 lg:p-0">
                  <Input className={cell} placeholder={t("variantName")} value={row.name} onChange={(e) => setVariants(variants.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} aria-label={t("variantName")} />
                  <Input className={cell} placeholder={t("sku")} value={row.sku} onChange={(e) => setVariants(variants.map((r, j) => (j === i ? { ...r, sku: e.target.value } : r)))} aria-label={t("sku")} />
                  <Input className={cn(cell, "col-span-2 lg:col-span-1")} placeholder={t("variantAttributesPlaceholder")} value={row.attributes} onChange={(e) => setVariants(variants.map((r, j) => (j === i ? { ...r, attributes: e.target.value } : r)))} aria-label={t("variantAttributes")} />
                  <Input className={cell} inputMode="decimal" placeholder={t("variantPrice")} value={row.price} onChange={(e) => setVariants(variants.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))} aria-label={t("variantPrice")} />
                  <div className="flex gap-2">
                    <Input className={cell} type="number" min={1} placeholder={t("moq")} value={row.moq} onChange={(e) => setVariants(variants.map((r, j) => (j === i ? { ...r, moq: e.target.value } : r)))} aria-label={t("moq")} />
                    <button type="button" className="shrink-0 rounded p-2 text-steel-400 hover:bg-steel-100 hover:text-danger-600" onClick={() => setVariants(variants.filter((_, j) => j !== i))} aria-label={t("removeRow")}>
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={t("specifications")}
          description={t("specificationsHint")}
          action={
            <Button type="button" variant="secondary" size="xs" onClick={() => setSpecs([...specs, { name: "", value: "", unit: "" }])}>
              <Plus /> {t("addSpec")}
            </Button>
          }
        />
        <CardContent className="space-y-2">
          {fieldError("specsJson") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("specsJson")}
            </p>
          ) : null}
          {specs.length === 0 ? (
            <p className="text-xs text-steel-500">{t("noSpecs")}</p>
          ) : (
            specs.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_0.6fr_auto] gap-2">
                <Input className={cell} placeholder={t("specName")} value={row.name} onChange={(e) => setSpecs(specs.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} aria-label={t("specName")} />
                <Input className={cell} placeholder={t("specValue")} value={row.value} onChange={(e) => setSpecs(specs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} aria-label={t("specValue")} />
                <Input className={cell} placeholder={t("specUnit")} value={row.unit} onChange={(e) => setSpecs(specs.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))} aria-label={t("specUnit")} />
                <button type="button" className="rounded p-2 text-steel-400 hover:bg-steel-100 hover:text-danger-600" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} aria-label={t("removeRow")}>
                  <X className="size-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("certifications")} description={t("certificationsHint")} />
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {certifications.map((c) => (
              <Checkbox key={c.id} checked={certs.includes(c.id)} onChange={(e) => setCerts(e.target.checked ? [...certs, c.id] : certs.filter((x) => x !== c.id))} label={c.name} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("images.title")} description={t("images.hint")} />
        <CardContent className="space-y-4">
          {images.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, i) => (
                <li key={img.id} className="group relative overflow-hidden rounded-md border border-steel-200 bg-steel-50">
                  <div className="relative aspect-square">
                    <SmartImage src={img.url} alt={defaults.title} fill fallbackLabel={defaults.title} />
                  </div>
                  {i === 0 ? (
                    <Badge variant="brass" size="sm" className="absolute left-2 top-2">
                      <Star className="size-3" /> {t("images.primary")}
                    </Badge>
                  ) : null}
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    {i === 0 ? (
                      <span className="text-xs text-steel-500">{t("images.primary")}</span>
                    ) : (
                      <button type="button" disabled={primaryPending || !productId} onClick={() => makePrimary(img.id)} className="text-xs font-medium text-ink-700 hover:underline disabled:opacity-50">
                        {t("images.makePrimary")}
                      </button>
                    )}
                    <button type="button" onClick={() => setImages(images.filter((x) => x.id !== img.id))} className="rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-danger-600" aria-label={t("images.remove")}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {newImages.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {newImages.map((d) => (
                <li key={d.id} className="relative overflow-hidden rounded-md border border-dashed border-steel-300 bg-steel-50">
                  <div className="relative aspect-square">
                    <SmartImage src={d.url} alt={d.name} fill fallbackLabel={d.name} />
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs text-steel-500">{t("images.newUpload")}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {totalImages === 0 ? (
            <div className="flex items-center gap-2 text-sm text-steel-500">
              <ImageIcon className="size-4" /> {t("images.none")}
            </div>
          ) : null}
          <FileUpload name="imageDocumentIds" scope="product" visibility="PUBLIC" accept="image/*" multiple max={Math.max(0, 8 - images.length)} hint={t("images.uploadHint")} onChange={setNewImages} />
          {fieldError("imageDocumentIds") ? (
            <p className="text-xs text-danger-600" role="alert">
              {fieldError("imageDocumentIds")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <FormError state={state} />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-steel-200 bg-surface/95 px-4 py-3 shadow-card backdrop-blur">
        <div className="flex items-center gap-3 text-sm text-steel-600">
          <StatusBadge status={defaults.status} />
          {isLive && defaults.slug ? (
            <Link href={`/product/${defaults.slug}`} target="_blank" className="inline-flex items-center gap-1 text-ink-700 hover:underline">
              {t("viewOnMarketplace")} <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
          {isPending ? <span>{t("pendingNote")}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button href="/seller/products" variant="ghost">
            {t("cancel")}
          </Button>
          <Button type="submit" variant={isLive ? "primary" : "secondary"} name="intent" value="save" loading={pending}>
            {isLive ? t("saveChanges") : t("saveDraft")}
          </Button>
          {canPublish && !isLive && !isPending ? (
            <Button type="submit" variant="primary" name="intent" value="publish" loading={pending}>
              <Send /> {t("saveAndPublish")}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
