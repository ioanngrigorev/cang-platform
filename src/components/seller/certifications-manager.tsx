"use client";

import { Award, FileText, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { FileUpload } from "@/components/buyer/file-upload";
import { Button, EmptyState, Field, Input, Select, StatusBadge, TBody, TD, TH, THead, TR, Table } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { addCompanyCertificationAction, removeCompanyCertificationAction } from "@/modules/seller/company/actions";

export type CertificationRow = {
  id: string;
  name: string;
  code: string;
  issuingBody: string | null;
  certificateNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  document: { name: string; url: string } | null;
};

export function AddCertificationButton({ options }: { options: Array<{ id: string; name: string }> }) {
  const t = useTranslations("seller.certifications");
  return (
    <DialogForm
      action={addCompanyCertificationAction}
      title={t("addTitle")}
      description={t("addDescription")}
      submitLabel={t("addSubmit")}
      cancelLabel={t("cancel")}
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open}>
          <Plus /> {t("add")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("certification")} htmlFor="cert-id" error={fieldError("certificationId")} required>
            <Select id="cert-id" name="certificationId" defaultValue="" required>
              <option value="">{t("certificationNone")}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("certificateNumber")} htmlFor="cert-number" error={fieldError("certificateNumber")}>
            <Input id="cert-number" name="certificateNumber" maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("issuedAt")} htmlFor="cert-issued" error={fieldError("issuedAt")}>
              <Input id="cert-issued" name="issuedAt" type="date" />
            </Field>
            <Field label={t("expiresAt")} htmlFor="cert-expires" error={fieldError("expiresAt")}>
              <Input id="cert-expires" name="expiresAt" type="date" />
            </Field>
          </div>
          <FileUpload name="documentId" scope="company" label={t("document")} hint={t("documentHint")} accept="image/*,.pdf" multiple={false} max={1} />
        </div>
      )}
    </DialogForm>
  );
}

export function CertificationsTable({ rows, locale, canWrite }: { rows: CertificationRow[]; locale: string; canWrite: boolean }) {
  const t = useTranslations("seller.certifications");
  if (rows.length === 0) return <EmptyState icon={<Award />} title={t("empty")} description={t("emptyHint")} />;
  const now = Date.now();
  return (
    <Table>
      <THead>
        <TR>
          <TH>{t("colName")}</TH>
          <TH className="hidden md:table-cell">{t("colNumber")}</TH>
          <TH className="hidden lg:table-cell">{t("colIssuer")}</TH>
          <TH className="hidden sm:table-cell">{t("colIssued")}</TH>
          <TH>{t("colExpires")}</TH>
          <TH>{t("colStatus")}</TH>
          <TH className="hidden md:table-cell">{t("colDocument")}</TH>
          {canWrite ? <TH className="text-right">{t("colActions")}</TH> : null}
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => {
          const expired = r.expiresAt ? new Date(r.expiresAt).getTime() < now : false;
          return (
            <TR key={r.id}>
              <TD>
                <p className="font-medium text-ink-900">{r.name}</p>
                <p className="text-xs text-steel-500">{r.code}</p>
              </TD>
              <TD className="hidden text-steel-600 md:table-cell">{r.certificateNumber ?? "—"}</TD>
              <TD className="hidden text-steel-600 lg:table-cell">{r.issuingBody ?? "—"}</TD>
              <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{r.issuedAt ? formatDate(r.issuedAt, locale) : "—"}</TD>
              <TD className={expired ? "whitespace-nowrap text-danger-600" : "whitespace-nowrap text-steel-600"}>{r.expiresAt ? formatDate(r.expiresAt, locale) : "—"}</TD>
              <TD>
                <StatusBadge status={expired ? "EXPIRED" : r.status} label={t(`statuses.${expired ? "EXPIRED" : r.status}`)} />
              </TD>
              <TD className="hidden md:table-cell">
                {r.document ? (
                  <a href={r.document.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-ink-900 hover:underline">
                    <FileText className="size-4 text-steel-400" /> {t("viewDocument")}
                  </a>
                ) : (
                  <span className="text-xs text-steel-500">{t("noDocument")}</span>
                )}
              </TD>
              {canWrite ? (
                <TD className="text-right">
                  <ActionForm action={removeCompanyCertificationAction} hidden={{ companyCertificationId: r.id }} label={t("remove")} icon={<Trash2 />} variant="ghost" size="xs" />
                </TD>
              ) : null}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
