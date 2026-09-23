"use client";

import { FileText, Image as ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/modules/messaging/links";

export type PickedDocument = { id: string; url: string; name: string; mimeType: string; sizeBytes: number };

/**
 * Compact, translated uploader for chat attachments. Posts each file to /api/uploads (scope "message",
 * COMPANY visibility — the send action re-scopes them to COUNTERPARTY) and renders one hidden `name[]` input per
 * stored document so the surrounding server-action form receives the ids.
 */
export function AttachmentPicker({ name = "attachmentIds", max = 10, accept, label, hint, compact, className }: { name?: string; max?: number; accept?: string; label?: React.ReactNode; hint?: React.ReactNode; compact?: boolean; className?: string }) {
  const t = useTranslations("messaging.composer");
  const [docs, setDocs] = React.useState<PickedDocument[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const next = [...docs];
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, max - docs.length))) {
        const body = new FormData();
        body.append("file", file);
        body.append("scope", "message");
        body.append("visibility", "COMPANY");
        const res = await fetch("/api/uploads", { method: "POST", body });
        const json = (await res.json()) as PickedDocument & { error?: string };
        if (!res.ok) throw new Error(json.error ?? t("uploadFailed"));
        next.push({ id: json.id, url: json.url, name: json.name, mimeType: json.mimeType, sizeBytes: json.sizeBytes });
      }
      setDocs(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-900">
          {label}
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} id={inputId} type="file" accept={accept} multiple className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
        <Button type="button" variant={compact ? "ghost" : "secondary"} size="sm" onClick={() => inputRef.current?.click()} disabled={busy || docs.length >= max} aria-label={t("attach")} title={t("attach")}>
          {busy ? <Loader2 className="animate-spin" /> : <Paperclip />}
          <span className={cn(compact && "hidden sm:inline")}>{busy ? t("uploading") : t("attach")}</span>
        </Button>
        {hint ? <span className="text-xs text-steel-500">{hint}</span> : null}
        {error ? (
          <span className="text-xs text-danger-600" role="alert">
            {error}
          </span>
        ) : null}
      </div>
      {docs.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex max-w-full items-center gap-1.5 rounded-full border border-hairline bg-surface py-1 pl-2.5 pr-1 text-xs">
              {d.mimeType.startsWith("image/") ? <ImageIcon className="size-3.5 shrink-0 text-steel-500" /> : <FileText className="size-3.5 shrink-0 text-steel-500" />}
              <span className="max-w-[180px] truncate font-medium text-ink-900" title={d.name}>
                {d.name}
              </span>
              <span className="shrink-0 text-steel-500">{formatBytes(d.sizeBytes)}</span>
              <button type="button" className="shrink-0 rounded-full p-0.5 text-steel-400 hover:bg-steel-100 hover:text-danger-600" onClick={() => setDocs(docs.filter((x) => x.id !== d.id))} aria-label={t("remove", { name: d.name })}>
                <X className="size-3.5" />
              </button>
              <input type="hidden" name={`${name}[]`} value={d.id} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
