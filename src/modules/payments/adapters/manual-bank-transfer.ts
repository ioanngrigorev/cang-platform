import type { InitiateInput, InitiateResult, PaymentProviderAdapter, PaymentRow, ProviderRow } from "../provider";

/**
 * Manual bank transfer via a partner bank account (the partner — not CANG — is the account holder
 * for trade-assurance flows; for direct payments the supplier's account details are shown).
 * Finance staff confirm receipt in the Admin console; the same adapter shape is used by real gateways.
 */
export class ManualBankTransferAdapter implements PaymentProviderAdapter {
  readonly code = "manual_bank_transfer";

  async initiate(input: InitiateInput, provider: ProviderRow): Promise<InitiateResult> {
    const cfg = (provider.publicConfig ?? {}) as Record<string, unknown>;
    const reference = `${input.payment.paymentNumber}`;
    return {
      status: "PENDING",
      providerReference: reference,
      instructions: {
        method: "BANK_TRANSFER",
        beneficiaryName: cfg.beneficiaryName ?? "CANG Trade Assurance Partner Account",
        bankName: cfg.bankName ?? "Partner Bank (configure in Admin → Payment providers)",
        accountNumber: cfg.accountNumber ?? "—",
        swift: cfg.swift ?? "—",
        currency: input.payment.currency,
        amount: input.payment.amount,
        reference,
        note: `Include the reference ${reference} in the transfer description. Funds are matched automatically within 1 business day.`,
      },
    };
  }

  async confirm(_payment: PaymentRow, _provider: ProviderRow, evidence?: Record<string, unknown>) {
    return { providerTxnId: (evidence?.bankReference as string | undefined) ?? null };
  }

  async release(payment: PaymentRow) {
    return { providerTxnId: `REL-${payment.paymentNumber}` };
  }

  async refund(payment: PaymentRow) {
    return { providerTxnId: `RFD-${payment.paymentNumber}` };
  }
}
