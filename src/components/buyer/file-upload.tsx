"use client";

import { FileText, Loader2, Paperclip, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type UploadedDocument = { id: string; url: string; name: string; mimeType: string; sizeBytes: number };

/**
 * Uploads files to /api/uploads and renders one hidden input per stored document id, so the
 * surrounding <form action={serverAction}> receives them like any other field.
 */
export function FileUpload({
  name,
  scope,
  label,
  hint,
  accept,
  multiple = true,
  max = 10,
  visibility = "COMPANY",
  initial = [],
  className,
  onChange,
}: {
  name: string;
  scope: "rfq" | "order" | "verification" | "dispute" | "company" | "financing" | "shipment" | "quotation" | "avatar";
  label?: React.ReactNode;
  hint?: React.ReactNode;
  accept?: string;
  multiple?: boolean;
  max?: number;
  visibility?: "COMPANY" | "PUBLIC";
  initial?: UploadedDocument[];
  className?: string;
  onChange?: (docs: UploadedDocument[]) => void;
}) {
  const [docs, setDocs] = React.useState<UploadedDocument[]>(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = `${name}-file`;

  const update = (next: UploadedDocument[]) => {
    setDocs(next);
    onChange?.(next);
  };

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const next = [...docs];
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, max - docs.length))) {
        const body = new FormData();
        body.append("file", file);
        body.append("scope", scope);
        body.append("visibility", visibility);
        const res = await fetch("/api/uploads", { method: "POST", body });
        const json = (await res.json()) as UploadedDocument & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        next.push({ id: json.id, url: json.url, name: json.name, mimeType: json.mimeType, sizeBytes: json.sizeBytes });
      }
      update(multiple ? next : next.slice(-1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-900">
          {label}
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} id={inputId} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy || docs.length >= max}>
          {busy ? <Loader2 className="animate-spin" /> : <Paperclip />}
          {busy ? "Uploading…" : multiple ? "Add files" : docs.length ? "Replace file" : "Choose file"}
        </Button>
        {hint ? <span className="text-xs text-steel-500">{hint}</span> : null}
      </div>
      {error ? (
        <p className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
      {docs.length ? (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-md border border-steel-200 bg-white px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-steel-400" />
              <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-ink-900 hover:underline">
                {d.name}
              </a>
              <span className="shrink-0 text-xs text-steel-500">{(d.sizeBytes / 1024).toFixed(0)} KB</span>
              <button type="button" className="shrink-0 rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-danger-600" onClick={() => update(docs.filter((x) => x.id !== d.id))} aria-label={`Remove ${d.name}`}>
                <X className="size-3.5" />
              </button>
              <input type="hidden" name={multiple ? `${name}[]` : name} value={d.id} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
