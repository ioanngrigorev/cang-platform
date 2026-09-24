/**
 * Carrier adapters: map a carrier's own status / reason codes to CANG's shipment statuses, parse their
 * webhooks and (where a public tracking API exists) fetch the latest status by tracking number.
 *
 * Automatic (webhook + "sync by tracking number"): GHN, GHTK.
 * Others (Viettel Post, J&T, VNPost, ocean/air lines…): the logistics partner updates manually in the portal,
 * or pushes events through the partner API (/api/partner/v1) from its own TMS.
 *
 * Status and reason mappings follow the carriers' public API docs:
 *   GHN  https://api.ghn.vn/home/docs/detail?id=48 (statuses), id=47 (callback), id=121 (fail codes)
 *   GHTK https://api.ghtk.vn/en/docs/submit-order/webhook/ and https://pro-docs.ghtk.vn/5_webhook/
 */
import type { ReasonCode, ShipmentStatus } from "./statuses";

export type CarrierCode = "GHN" | "GHTK" | "VTP" | "JT" | "VNPOST" | "OTHER";

export const CARRIERS: Array<{ code: CarrierCode; name: string; auto: boolean; trackUrl?: (tracking: string) => string }> = [
  { code: "GHN", name: "Giao Hàng Nhanh (GHN)", auto: true, trackUrl: (n) => `https://donhang.ghn.vn/?order_code=${encodeURIComponent(n)}` },
  { code: "GHTK", name: "Giao Hàng Tiết Kiệm (GHTK)", auto: true, trackUrl: (n) => `https://i.ghtk.vn/${encodeURIComponent(n)}` },
  { code: "VTP", name: "Viettel Post", auto: false, trackUrl: (n) => `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?code=${encodeURIComponent(n)}` },
  { code: "JT", name: "J&T Express", auto: false, trackUrl: (n) => `https://jtexpress.vn/vi/tracking?type=track&billcode=${encodeURIComponent(n)}` },
  { code: "VNPOST", name: "VNPost (EMS)", auto: false },
  { code: "OTHER", name: "Other / own fleet", auto: false },
];

export function carrierByCode(code: string | null | undefined) {
  return CARRIERS.find((c) => c.code === code) ?? null;
}

/** A carrier status translated to CANG terms. `status: null` = informational only (kept as a checkpoint). */
export type MappedCarrierEvent = {
  status: ShipmentStatus | null;
  reasonCode: ReasonCode | null;
  carrierStatus: string;
  occurredAt: Date;
  description: string | null;
  location: string | null;
  weightKg: number | null;
  raw: Record<string, unknown>;
};

// ---------- GHN ----------

const GHN_STATUS: Record<string, ShipmentStatus | null> = {
  ready_to_pick: "READY_TO_PICK",
  picking: "READY_TO_PICK",
  money_collect_picking: "READY_TO_PICK",
  picked: "PICKED_UP",
  storing: "AT_WAREHOUSE",
  sorting: "AT_WAREHOUSE",
  transporting: "IN_TRANSIT",
  delivering: "OUT_FOR_DELIVERY",
  money_collect_delivering: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  delivery_fail: "DELIVERY_FAILED",
  waiting_to_return: "DELIVERY_FAILED",
  return: "RETURNING",
  return_transporting: "RETURNING",
  return_sorting: "RETURNING",
  returning: "RETURNING",
  return_fail: "EXCEPTION",
  returned: "RETURNED",
  cancel: "CANCELLED",
  exception: "EXCEPTION",
  damage: "DAMAGED",
  lost: "LOST",
};

const GHN_REASON: Record<string, ReasonCode> = {
  PFA1A0: "SENDER_RESCHEDULED",
  PFA2A1: "SENDER_UNREACHABLE",
  PFA2A3: "SENDER_UNREACHABLE",
  PFA2A2: "WRONG_PICKUP_INFO",
  PFA4A1: "PACKAGING_VIOLATION",
  PCB0B2: "PACKAGING_VIOLATION",
  PFA4A2: "PROHIBITED_GOODS",
  PFA3A2: "CARRIER_OVERLOAD",
  DFC1A0: "RECEIVER_RESCHEDULED",
  DFC1A2: "RECEIVER_UNREACHABLE",
  DFC1A4: "RECEIVER_UNREACHABLE",
  DFC1A1: "ADDRESS_CHANGED",
  DCD0A1: "WRONG_ADDRESS",
  DCD0A5: "REFUSED_DAMAGED",
  DCD0A6: "REFUSED_WRONG_ITEM",
  DCD0A7: "REFUSED_COD",
  DCD0A8: "REFUSED_CHANGED_MIND",
  DCD1A3: "DAMAGED_IN_TRANSIT",
  RFE0A3: "SENDER_REFUSED_RETURN",
  RFE0A4: "SENDER_REFUSED_RETURN",
};

function ghnReason(code: unknown): ReasonCode | null {
  if (typeof code !== "string" || !code) return null;
  return GHN_REASON[code.replace(/^GHN-/i, "").toUpperCase()] ?? "OTHER";
}

function toDate(v: unknown): Date {
  const d = typeof v === "string" || typeof v === "number" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date();
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** GHN callback body: { OrderCode, Status, Time, Reason, ReasonCode, Weight, Type, ... } */
export function parseGhnWebhook(body: Record<string, unknown>): { trackingNumber: string; event: MappedCarrierEvent } | null {
  const trackingNumber = typeof body.OrderCode === "string" ? body.OrderCode : null;
  const carrierStatus = typeof body.Status === "string" ? body.Status.toLowerCase() : null;
  if (!trackingNumber || !carrierStatus) return null;
  const status = carrierStatus in GHN_STATUS ? GHN_STATUS[carrierStatus] : null;
  const reason = typeof body.Reason === "string" && body.Reason ? body.Reason : null;
  return {
    trackingNumber,
    event: {
      status,
      reasonCode: ghnReason(body.ReasonCode) ?? (status && ["DELIVERY_FAILED", "EXCEPTION", "LOST", "DAMAGED", "RETURNING"].includes(status) ? "OTHER" : null),
      carrierStatus,
      occurredAt: toDate(body.Time),
      description: [reason, typeof body.Type === "string" && body.Type !== "Switch_status" ? body.Type : null].filter(Boolean).join(" · ") || null,
      location: typeof body.Warehouse === "string" ? body.Warehouse : null,
      weightKg: num(body.ConvertedWeight ?? body.Weight) != null ? (num(body.ConvertedWeight ?? body.Weight) as number) / 1000 : null,
      raw: body,
    },
  };
}

/** GHN order detail → status history. */
export async function fetchGhn(trackingNumber: string, config: { token?: string; shopId?: string | number; baseUrl?: string }): Promise<MappedCarrierEvent[]> {
  if (!config.token) throw new Error("GHN API token is not configured for this provider.");
  const base = config.baseUrl ?? "https://online-gateway.ghn.vn/shiip/public-api";
  const res = await fetch(`${base}/v2/shipping-order/detail`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Token: config.token, ...(config.shopId ? { ShopId: String(config.shopId) } : {}) },
    body: JSON.stringify({ order_code: trackingNumber }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { code?: number; message?: string; data?: Record<string, unknown> } | null;
  if (!res.ok || !json || json.code !== 200 || !json.data) throw new Error(`GHN: ${json?.message ?? res.statusText}`);
  const data = json.data;
  const log = Array.isArray(data.log) ? (data.log as Array<Record<string, unknown>>) : [];
  const history = log.length ? log : [{ status: data.status, updated_date: data.updated_date }];
  return history
    .map((h) => {
      const carrierStatus = String(h.status ?? "").toLowerCase();
      return {
        status: carrierStatus in GHN_STATUS ? GHN_STATUS[carrierStatus] : null,
        reasonCode: ghnReason(h.reason_code),
        carrierStatus,
        occurredAt: toDate(h.updated_date),
        description: typeof h.reason === "string" && h.reason ? h.reason : null,
        location: null,
        weightKg: null,
        raw: h,
      } satisfies MappedCarrierEvent;
    })
    .filter((e) => e.carrierStatus);
}

// ---------- GHTK ----------

const GHTK_STATUS: Record<string, ShipmentStatus | null> = {
  "-1": "CANCELLED",
  "1": "BOOKED",
  "2": "READY_TO_PICK",
  "12": "READY_TO_PICK",
  "8": null, // pickup delayed — checkpoint only
  "7": "PICKUP_FAILED",
  "3": "PICKED_UP",
  "4": "OUT_FOR_DELIVERY",
  "10": null, // delivery delayed — checkpoint only
  "9": "DELIVERY_FAILED",
  "5": "DELIVERED",
  "6": "DELIVERED", // delivered and reconciled
  "20": "RETURNING",
  "21": "RETURNED",
  "11": "RETURNED", // returned and reconciled
  "13": "EXCEPTION", // compensation case
};

function ghtkReason(code: unknown): ReasonCode | null {
  const n = num(code);
  if (n == null) return null;
  if (n === 100 || n === 104 || n === 140) return "SENDER_RESCHEDULED";
  if (n === 101 || n === 141) return "SENDER_UNREACHABLE";
  if (n === 102) return "CARGO_NOT_READY";
  if (n === 105) return "CARRIER_OVERLOAD";
  if (n === 106 || n === 126) return "WEATHER";
  if (n === 111) return "PROHIBITED_GOODS";
  if (n === 121 || n === 123) return "RECEIVER_RESCHEDULED";
  if (n === 122 || n === 131) return "RECEIVER_UNREACHABLE";
  if (n === 124) return "ADDRESS_CHANGED";
  if (n === 125 || n === 1200) return "WRONG_ADDRESS";
  if (n === 130) return "REFUSED_CHANGED_MIND";
  return "OTHER";
}

/** GHTK webhook: { label_id, partner_id, status_id, action_time, reason_code, reason, weight, fee, ... } */
export function parseGhtkWebhook(body: Record<string, unknown>): { trackingNumber: string; event: MappedCarrierEvent } | null {
  const trackingNumber = typeof body.label_id === "string" ? body.label_id : null;
  const statusId = body.status_id != null ? String(body.status_id) : null;
  if (!trackingNumber || !statusId) return null;
  const status = statusId in GHTK_STATUS ? GHTK_STATUS[statusId] : null;
  return {
    trackingNumber,
    event: {
      status,
      reasonCode: ghtkReason(body.reason_code) ?? (status && ["PICKUP_FAILED", "DELIVERY_FAILED", "EXCEPTION"].includes(status) ? "OTHER" : null),
      carrierStatus: statusId,
      occurredAt: toDate(body.action_time),
      description: typeof body.reason === "string" && body.reason ? body.reason : null,
      location: typeof body.cur_station === "string" ? body.cur_station : null,
      weightKg: num(body.weight),
      raw: body,
    },
  };
}

export async function fetchGhtk(trackingNumber: string, config: { token?: string; baseUrl?: string }): Promise<MappedCarrierEvent[]> {
  if (!config.token) throw new Error("GHTK API token is not configured for this provider.");
  const base = config.baseUrl ?? "https://services.giaohangtietkiem.vn";
  const res = await fetch(`${base}/services/shipment/v2/${encodeURIComponent(trackingNumber)}`, {
    headers: { Token: config.token },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string; order?: Record<string, unknown> } | null;
  if (!res.ok || !json?.success || !json.order) throw new Error(`GHTK: ${json?.message ?? res.statusText}`);
  const o = json.order;
  const statusId = String(o.status ?? "");
  return [
    {
      status: statusId in GHTK_STATUS ? GHTK_STATUS[statusId] : null,
      reasonCode: null,
      carrierStatus: statusId,
      occurredAt: toDate(o.modified ?? o.updated ?? Date.now()),
      description: typeof o.status_text === "string" ? o.status_text : null,
      location: null,
      weightKg: num(o.weight),
      raw: o,
    },
  ];
}

export function parseCarrierWebhook(carrier: string, body: Record<string, unknown>) {
  if (carrier === "GHN") return parseGhnWebhook(body);
  if (carrier === "GHTK") return parseGhtkWebhook(body);
  return null;
}

export async function fetchCarrierHistory(carrier: string, trackingNumber: string, config: Record<string, unknown>): Promise<MappedCarrierEvent[]> {
  if (carrier === "GHN") return fetchGhn(trackingNumber, config as { token?: string });
  if (carrier === "GHTK") return fetchGhtk(trackingNumber, config as { token?: string });
  throw new Error("Automatic tracking is available for GHN and GHTK. Update this carrier's shipments manually or through the partner API.");
}

/** Stable idempotency key for a carrier event. */
export function carrierEventKey(carrier: string, trackingNumber: string, e: Pick<MappedCarrierEvent, "carrierStatus" | "occurredAt">) {
  return `${carrier}|${trackingNumber}|${e.carrierStatus}|${e.occurredAt.toISOString()}`;
}
