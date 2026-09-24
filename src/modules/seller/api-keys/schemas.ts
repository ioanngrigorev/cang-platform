import { z } from "zod";

export const SELLER_API_SCOPES = ["products:read", "products:write", "rfqs:read", "quotations:write", "orders:read", "orders:write", "analytics:read"] as const;
/** Logistics partners: read assigned shipments, push status events from their own TMS. */
export const PARTNER_API_SCOPES = ["shipments:read", "shipments:write"] as const;
export const API_SCOPES = [...SELLER_API_SCOPES, ...PARTNER_API_SCOPES] as const;
export type ApiScope = (typeof API_SCOPES)[number];

const scopeList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .pipe(z.array(z.enum(API_SCOPES)))
  .transform((v) => Array.from(new Set(v)))
  .refine((v) => v.length > 0, "Choose at least one scope");

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, "Give the key a name").max(80),
  scopes: scopeList,
  expiresInDays: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    }),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const apiKeyIdSchema = z.object({ apiKeyId: z.string().trim().min(1) });
