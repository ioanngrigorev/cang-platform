import type { paymentProviders, payments } from "@/db/schema";

/**
 * Payment orchestration abstraction.
 *
 * CANG never holds client money. Each adapter talks to a regulated partner
 * (bank transfer instructions, PSP gateway, licensed escrow partner, virtual accounts).
 * Core business logic (orders, trade assurance, payouts) only depends on this interface.
 */
export type ProviderRow = typeof paymentProviders.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;

export type InitiateInput = {
  payment: PaymentRow;
  payer: { companyId: string | null; name: string; email?: string | null; countryCode?: string | null };
  payee: { companyId: string | null; name: string };
  description: string;
  returnUrl?: string;
};

export type InitiateResult = {
  /** Human/machine instructions for the payer (bank details, VA number, redirect URL...). */
  instructions: Record<string, unknown>;
  /** Provider-side reference, if any. */
  providerReference?: string | null;
  /** Some providers authorize immediately (cards), most start PENDING. */
  status: "PENDING" | "AUTHORIZED" | "PAID";
  redirectUrl?: string | null;
};

export type WebhookEvent = {
  providerReference: string;
  type: "PAID" | "SETTLED" | "FAILED" | "REFUNDED" | "RELEASED";
  amount?: number;
  currency?: string;
  raw?: Record<string, unknown>;
};

export interface PaymentProviderAdapter {
  readonly code: string;
  /** Start a payment: produce payer instructions or a redirect. */
  initiate(input: InitiateInput, provider: ProviderRow): Promise<InitiateResult>;
  /** Confirm funds received (called by webhook or by finance staff for manual providers). */
  confirm(payment: PaymentRow, provider: ProviderRow, evidence?: Record<string, unknown>): Promise<{ providerTxnId?: string | null }>;
  /** Release held funds (escrow-like flows) to the payee. */
  release(payment: PaymentRow, provider: ProviderRow, amount?: number): Promise<{ providerTxnId?: string | null }>;
  /** Refund the payer (full or partial). */
  refund(payment: PaymentRow, provider: ProviderRow, amount?: number, reason?: string): Promise<{ providerTxnId?: string | null }>;
  /** Parse and verify an inbound webhook. */
  parseWebhook?(req: Request, provider: ProviderRow): Promise<WebhookEvent | null>;
}
