import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentProviders } from "@/db/schema";
import { ManualBankTransferAdapter } from "./adapters/manual-bank-transfer";
import type { PaymentProviderAdapter, ProviderRow } from "./provider";

const adapters: Record<string, PaymentProviderAdapter> = {
  manual_bank_transfer: new ManualBankTransferAdapter(),
  // vnpay: new VnPayAdapter(), stripe: new StripeAdapter(), escrow_partner: new EscrowPartnerAdapter() ...
};

export function adapterFor(provider: ProviderRow): PaymentProviderAdapter {
  const a = adapters[provider.adapterCode];
  if (!a) throw new Error(`No payment adapter registered for "${provider.adapterCode}"`);
  return a;
}

export function registerAdapter(adapter: PaymentProviderAdapter) {
  adapters[adapter.code] = adapter;
}

/** Pick the provider for a payment: explicit id, else default active, else first active supporting the currency. */
export async function chooseProvider(opts: { providerId?: string | null; currency: string; escrow?: boolean }): Promise<ProviderRow | null> {
  if (opts.providerId) {
    const [p] = await db.select().from(paymentProviders).where(and(eq(paymentProviders.id, opts.providerId), eq(paymentProviders.isActive, true))).limit(1);
    if (p) return p;
  }
  const active = await db.select().from(paymentProviders).where(eq(paymentProviders.isActive, true)).orderBy(paymentProviders.sortOrder);
  const supports = (p: ProviderRow) => p.supportedCurrencies.length === 0 || p.supportedCurrencies.includes(opts.currency);
  return (
    active.find((p) => p.isDefault && supports(p) && (!opts.escrow || p.supportsEscrow)) ??
    active.find((p) => supports(p) && (!opts.escrow || p.supportsEscrow)) ??
    active[0] ??
    null
  );
}
