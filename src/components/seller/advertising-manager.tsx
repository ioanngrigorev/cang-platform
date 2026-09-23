"use client";

import { Megaphone, Pause, Play, Plus, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, EmptyState, Field, Input, Select, StatusBadge, TBody, TD, TH, THead, TR, Table, Textarea } from "@/components/ui";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { cancelCampaignAction, createCampaignAction, pauseCampaignAction, resumeCampaignAction } from "@/modules/seller/advertising/actions";

export type AdProductOption = { id: string; code: string; name: string; placement: string; pricingModel: string; price: number; currency: string; minBudget: number | null };
export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  adProduct: { name: string; placement: string; pricingModel: string };
  budget: number;
  spent: number;
  dailyBudget: number | null;
  currency: string;
  startAt: string;
  endAt: string | null;
  rejectionReason: string | null;
  target: string | null;
  impressions: number;
  clicks: number;
  leads: number;
};

export function CreateCampaignButton({ adProducts, products, locale }: { adProducts: AdProductOption[]; products: Array<{ id: string; title: string }>; locale: string }) {
  const t = useTranslations("seller.advertising");
  const [adProductId, setAdProductId] = React.useState(adProducts[0]?.id ?? "");
  const selected = adProducts.find((p) => p.id === adProductId);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <DialogForm
      action={createCampaignAction}
      title={t("createTitle")}
      description={t("createDescription")}
      submitLabel={t("createSubmit")}
      cancelLabel={t("cancel")}
      size="lg"
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open}>
          <Plus /> {t("create")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("adProduct")} htmlFor="ad-product" error={fieldError("adProductId")} required hint={selected ? t("adProductHint", { price: formatMoney(selected.price, selected.currency, locale), model: t(`pricingModels.${selected.pricingModel}`), min: selected.minBudget != null ? formatMoney(selected.minBudget, selected.currency, locale) : "—" }) : undefined}>
            <Select id="ad-product" name="adProductId" value={adProductId} onChange={(e) => setAdProductId(e.target.value)} required>
              {adProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {t(`placements.${p.placement}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("name")} htmlFor="campaign-name" error={fieldError("name")} required>
            <Input id="campaign-name" name="name" required maxLength={120} placeholder={t("namePlaceholder")} />
          </Field>
          <Field label={t("product")} htmlFor="campaign-product" error={fieldError("productId")} required={selected?.placement === "FEATURED_PRODUCT"} hint={t("productHint")}>
            <Select id="campaign-product" name="productId" defaultValue="">
              <option value="">{t("productNone")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("budget")} htmlFor="campaign-budget" error={fieldError("budget")} required>
              <Input id="campaign-budget" name="budget" inputMode="decimal" required defaultValue={selected?.minBudget ?? ""} />
            </Field>
            <Field label={t("dailyBudget")} htmlFor="campaign-daily" error={fieldError("dailyBudget")}>
              <Input id="campaign-daily" name="dailyBudget" inputMode="decimal" />
            </Field>
            <Field label={t("startAt")} htmlFor="campaign-start" error={fieldError("startAt")} required>
              <Input id="campaign-start" name="startAt" type="date" defaultValue={today} required />
            </Field>
            <Field label={t("endAt")} htmlFor="campaign-end" error={fieldError("endAt")}>
              <Input id="campaign-end" name="endAt" type="date" />
            </Field>
          </div>
          <Field label={t("keywords")} htmlFor="campaign-keywords" error={fieldError("keywords")} hint={t("keywordsHint")}>
            <Textarea id="campaign-keywords" name="keywords" rows={2} />
          </Field>
        </div>
      )}
    </DialogForm>
  );
}

export function CampaignsTable({ rows, locale, canManage }: { rows: CampaignRow[]; locale: string; canManage: boolean }) {
  const t = useTranslations("seller.advertising");
  if (rows.length === 0) return <EmptyState icon={<Megaphone />} title={t("empty")} description={t("emptyHint")} />;
  return (
    <Table>
      <THead>
        <TR>
          <TH>{t("colCampaign")}</TH>
          <TH className="hidden md:table-cell">{t("colPlacement")}</TH>
          <TH>{t("colStatus")}</TH>
          <TH className="hidden sm:table-cell">{t("colBudget")}</TH>
          <TH className="hidden lg:table-cell">{t("colPerformance")}</TH>
          <TH className="hidden md:table-cell">{t("colDates")}</TH>
          {canManage ? <TH className="text-right">{t("colActions")}</TH> : null}
        </TR>
      </THead>
      <TBody>
        {rows.map((c) => (
          <TR key={c.id}>
            <TD className="min-w-[220px]">
              <p className="font-medium text-ink-900">{c.name}</p>
              <p className="max-w-[260px] truncate text-xs text-steel-500">{c.target ?? t("targetCompany")}</p>
              {c.status === "REJECTED" && c.rejectionReason ? <p className="mt-0.5 text-xs text-danger-600">{c.rejectionReason}</p> : null}
            </TD>
            <TD className="hidden text-steel-600 md:table-cell">
              {c.adProduct.name}
              <p className="text-xs text-steel-500">{t(`pricingModels.${c.adProduct.pricingModel}`)}</p>
            </TD>
            <TD>
              <StatusBadge status={c.status} label={t(`statuses.${c.status}`)} />
            </TD>
            <TD className="hidden whitespace-nowrap sm:table-cell">
              <span className="font-medium tabular-nums">{formatMoney(c.spent, c.currency, locale)}</span>
              <span className="text-steel-500"> / {formatMoney(c.budget, c.currency, locale)}</span>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-steel-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, c.budget > 0 ? (c.spent / c.budget) * 100 : 0)}%` }} />
              </div>
              {c.dailyBudget ? <p className="mt-0.5 text-xs text-steel-500">{t("perDay", { amount: formatMoney(c.dailyBudget, c.currency, locale) })}</p> : null}
            </TD>
            <TD className="hidden text-xs text-steel-600 lg:table-cell">
              <p>
                {formatNumber(c.impressions, locale)} {t("impressions")} · {formatNumber(c.clicks, locale)} {t("clicks")}
              </p>
              <p>
                {formatNumber(c.leads, locale)} {t("leads")}
                {c.impressions > 0 ? ` · CTR ${((c.clicks / c.impressions) * 100).toFixed(1)}%` : ""}
              </p>
            </TD>
            <TD className="hidden whitespace-nowrap text-xs text-steel-600 md:table-cell">
              {formatDate(c.startAt, locale)} → {c.endAt ? formatDate(c.endAt, locale) : t("openEnded")}
            </TD>
            {canManage ? (
              <TD className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {c.status === "ACTIVE" ? <ActionForm action={pauseCampaignAction} hidden={{ campaignId: c.id }} label={t("pause")} icon={<Pause />} size="xs" /> : null}
                  {c.status === "PAUSED" ? <ActionForm action={resumeCampaignAction} hidden={{ campaignId: c.id }} label={t("resume")} icon={<Play />} size="xs" variant="primary" /> : null}
                  {["PENDING_REVIEW", "ACTIVE", "PAUSED", "DRAFT"].includes(c.status) ? <ActionForm action={cancelCampaignAction} hidden={{ campaignId: c.id }} label={t("cancelCampaign")} icon={<XCircle />} size="xs" variant="ghost" /> : null}
                </div>
              </TD>
            ) : null}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
