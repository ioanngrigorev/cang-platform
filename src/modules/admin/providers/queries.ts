import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { inspectionProviders, paymentProviders } from "@/db/schema";
import { listFinancingProviders } from "../financing/queries";
import { listLogisticsProvidersAll } from "../logistics/queries";
import { maskSecrets } from "../shared";

export async function listPaymentProvidersAll() {
  const rows = await db.select().from(paymentProviders).orderBy(asc(paymentProviders.sortOrder), asc(paymentProviders.name));
  return rows.map((r) => ({ ...r, publicConfig: maskSecrets(r.publicConfig) }));
}

export async function listInspectionProvidersAll() {
  const rows = await db.select().from(inspectionProviders).orderBy(asc(inspectionProviders.sortOrder), asc(inspectionProviders.name));
  return rows.map((r) => ({ ...r, apiConfig: maskSecrets(r.apiConfig) }));
}

export async function allProviders() {
  const [payment, logistics, financing, inspection] = await Promise.all([listPaymentProvidersAll(), listLogisticsProvidersAll(), listFinancingProviders(), listInspectionProvidersAll()]);
  return {
    payment,
    logistics: logistics.map((r) => ({ ...r, apiConfig: maskSecrets(r.apiConfig) })),
    financing: financing.map((r) => ({ ...r, apiConfig: maskSecrets(r.apiConfig) })),
    inspection,
  };
}

/** Email delivery settings live in env; expose which provider is configured without leaking secrets. */
export function emailProviderSummary() {
  const env = process.env;
  const provider = env.EMAIL_PROVIDER || "console";
  let smtpHost: string | null = null;
  try {
    smtpHost = env.SMTP_URL ? new URL(env.SMTP_URL).host : null;
  } catch {
    smtpHost = null;
  }
  return { provider, from: env.EMAIL_FROM || "CANG <no-reply@cang.vn>", smtpHost, credentialsConfigured: !!(env.RESEND_API_KEY || env.SMTP_URL) };
}
