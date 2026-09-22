"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button, Checkbox, Input } from "@/components/ui";

export type OwnerRow = { fullName: string; nationality: string; ownershipPercent: string; role: string; isPep: boolean };

const empty = (): OwnerRow => ({ fullName: "", nationality: "", ownershipPercent: "", role: "", isPep: false });

/** Repeatable ultimate-beneficial-owner rows serialised into a single `ownersJson` field. */
export function BeneficialOwners({ name = "ownersJson", initial = [], error }: { name?: string; initial?: OwnerRow[]; error?: string }) {
  const t = useTranslations("buyer.verification");
  const [rows, setRows] = React.useState<OwnerRow[]>(initial.length ? initial : [empty()]);
  const set = (i: number, patch: Partial<OwnerRow>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const payload = rows
    .filter((r) => r.fullName.trim())
    .map((r) => ({
      fullName: r.fullName.trim(),
      nationality: r.nationality.trim() || null,
      ownershipPercent: Number(r.ownershipPercent || 0),
      role: r.role.trim() || null,
      isPep: r.isPep,
    }));
  const totalPercent = payload.reduce((s, r) => s + (Number.isFinite(r.ownershipPercent) ? r.ownershipPercent : 0), 0);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border border-steel-200 bg-steel-50/50 p-3">
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="text-xs font-medium text-steel-600" htmlFor={`owner-name-${i}`}>
                {t("ownerName")}
              </label>
              <Input id={`owner-name-${i}`} value={row.fullName} onChange={(e) => set(i, { fullName: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-steel-600" htmlFor={`owner-nat-${i}`}>
                {t("ownerNationality")}
              </label>
              <Input id={`owner-nat-${i}`} value={row.nationality} onChange={(e) => set(i, { nationality: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-steel-600" htmlFor={`owner-pct-${i}`}>
                {t("ownerPercent")}
              </label>
              <Input id={`owner-pct-${i}`} type="number" min={0} max={100} step="0.01" value={row.ownershipPercent} onChange={(e) => set(i, { ownershipPercent: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-steel-600" htmlFor={`owner-role-${i}`}>
                {t("ownerRole")}
              </label>
              <Input id={`owner-role-${i}`} value={row.role} onChange={(e) => set(i, { role: e.target.value })} />
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [empty()])} aria-label={t("removeOwner")}>
                <Trash2 className="text-danger-600" />
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <Checkbox checked={row.isPep} onChange={(e) => set(i, { isPep: e.target.checked })} label={t("ownerPep")} description={t("ownerPepHint")} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows([...rows, empty()])}>
          <Plus /> {t("addOwner")}
        </Button>
        <span className="text-xs text-steel-500">{t("ownershipTotal", { total: totalPercent.toFixed(2) })}</span>
      </div>
      {error ? (
        <p className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
