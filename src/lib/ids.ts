import { randomBytes, randomInt } from "node:crypto";

/**
 * Human-readable business identifiers, e.g. RFQ-2026-4K7Q2M, ORD-2026-9H3TZ1.
 * Uniqueness is enforced by DB unique indexes; collisions are astronomically unlikely
 * but callers should retry on unique-violation.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function businessNumber(prefix: string, length = 6): string {
  const year = new Date().getFullYear();
  let body = "";
  for (let i = 0; i < length; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${year}-${body}`;
}

export const rfqNumber = () => businessNumber("RFQ");
export const quotationNumber = () => businessNumber("QUO");
export const orderNumber = () => businessNumber("ORD");
export const paymentNumber = () => businessNumber("PAY");
export const invoiceNumber = () => businessNumber("INV");
export const shipmentNumber = () => businessNumber("SHP");
export const disputeNumber = () => businessNumber("DSP");
export const financingNumber = () => businessNumber("FIN");
export const inspectionNumber = () => businessNumber("INS");
export const logisticsRequestNumber = () => businessNumber("LOG");
export const ticketNumber = () => businessNumber("TKT");

export function secureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function numericOtp(digits = 6): string {
  let s = "";
  for (let i = 0; i < digits; i++) s += String(randomInt(10));
  return s;
}
