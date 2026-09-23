import { z } from "zod";

/** Admin lists are dense: 25 rows per page. */
export const PAGE_SIZE = 25;

export function pageParam(v: string | string[] | undefined): number {
  const raw = Array.isArray(v) ? v[0] : v;
  return Math.max(1, Number(raw ?? 1) || 1);
}

export function str(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return (raw ?? "").trim();
}

export function pageInfo(total: number, page: number, pageSize = PAGE_SIZE) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Build a locale-less href with only the non-empty params. */
export function qs(base: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

// ---- zod helpers shared by every admin schema ----

export const idSchema = z.string().trim().min(1, "Missing id");

export const reasonSchema = z.string().trim().min(5, "Give a reason (at least 5 characters)").max(2000);

export const optionalText = (max = 4000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

export const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || !Number.isNaN(n), "Enter a valid number");

export const requiredNumber = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(/,/g, ""))))
  .refine((n) => Number.isFinite(n), "Enter a valid number");

export const requiredInt = z.coerce.number().int("Whole number");

/** Checkbox → boolean ("on"/"true"/true → true, anything else → false). */
export const checkbox = z
  .union([z.string(), z.boolean(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (Array.isArray(v)) return v.some((x) => x === "on" || x === "true");
    return v === true || v === "on" || v === "true";
  });

/** JSON textarea → parsed value (null when empty). */
export const jsonText = (message = "Enter valid JSON") =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      const s = (v ?? "").trim();
      if (!s) return null as unknown;
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
    });

/** Comma / newline separated list → string[] */
export const listText = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

const SECRET_KEY = /secret|key|token|password|passwd|credential|private/i;
export const MASK = "••••••••";

/** Deep-mask any value whose key looks like a secret so it never renders in the console. */
export function maskSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => maskSecrets(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) && typeof v === "string" && v ? MASK : maskSecrets(v);
    }
    return out as T;
  }
  return value;
}

/** Merge a masked JSON edit back over the stored value: masked entries keep their previous value. */
export function unmaskSecrets(next: unknown, previous: unknown): unknown {
  if (!next || typeof next !== "object" || Array.isArray(next)) return next;
  const prev = previous && typeof previous === "object" && !Array.isArray(previous) ? (previous as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next as Record<string, unknown>)) {
    if (v === MASK && k in prev) out[k] = prev[k];
    else if (v && typeof v === "object" && !Array.isArray(v)) out[k] = unmaskSecrets(v, prev[k]);
    else out[k] = v;
  }
  return out;
}

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
