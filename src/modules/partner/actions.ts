"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { companies, logisticsProviders, shipments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { sha256 } from "@/modules/auth/session";
import { LOGISTICS_SERVICES } from "@/modules/admin/logistics/schemas";
import { optionalText, shipmentTrackingSchema, shipmentUpdateSchema } from "@/modules/logistics/tracking/schemas";
import { applyShipmentUpdate, attachShipmentDocuments, setShipmentTracking, syncShipmentTracking } from "@/modules/logistics/tracking/service";
import { SHIPMENT_MODES } from "@/modules/logistics/tracking/statuses";
import { requirePartner } from "./context";

function revalidate(shipmentId?: string) {
  revalidatePath("/[locale]/partner", "page");
  revalidatePath("/[locale]/partner/shipments", "page");
  if (shipmentId) revalidatePath(`/[locale]/partner/shipments/${shipmentId}`, "page");
}

async function ownShipment(providerId: string, shipmentId: string) {
  const [row] = await db.select({ id: shipments.id, providerId: shipments.providerId }).from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!row || row.providerId !== providerId) throw new ActionError("Shipment not found.", "NOT_FOUND");
  return row;
}

const docIds = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean));

/** Report a status from the partner portal (dispatcher or driver). */
export async function partnerUpdateStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company, provider } = await requirePartner({ permission: "shipments.update", requireActive: true });
    const raw = formDataToObject(formData);
    const parsed = parseInput(shipmentUpdateSchema.extend({ attachments: docIds, pod: docIds }), raw);
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    await ownShipment(provider.id, d.shipmentId);
    const [pod, other] = await Promise.all([
      attachShipmentDocuments({ shipmentId: d.shipmentId, documentIds: d.pod, ownerCompanyId: company.id, kind: "POD" }),
      attachShipmentDocuments({ shipmentId: d.shipmentId, documentIds: d.attachments, ownerCompanyId: company.id }),
    ]);
    await applyShipmentUpdate(
      { kind: "PARTNER", userId: user.id, companyId: company.id, via: "portal" },
      { ...d, podUrl: pod[0]?.url ?? d.podUrl ?? null, attachments: [...pod.slice(1), ...other] },
    );
    revalidate(d.shipmentId);
    return ok(undefined, "Status updated — the buyer and supplier have been notified.");
  });
}

export async function partnerSetTrackingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company, provider } = await requirePartner({ permission: "shipments.update", requireActive: true });
    const parsed = parseInput(shipmentTrackingSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await ownShipment(provider.id, parsed.data.shipmentId);
    await setShipmentTracking({ kind: "PARTNER", userId: user.id, companyId: company.id, via: "portal" }, parsed.data);
    revalidate(parsed.data.shipmentId);
    return ok(undefined, "Tracking details saved.");
  });
}

export async function partnerSyncTrackingAction(_prev: ActionResult<{ applied: number }> | null, formData: FormData): Promise<ActionResult<{ applied: number }>> {
  return runAction(async () => {
    const { provider } = await requirePartner({ permission: "shipments.update", requireActive: true });
    const shipmentId = String(formData.get("shipmentId") ?? "");
    await ownShipment(provider.id, shipmentId);
    const res = await syncShipmentTracking(shipmentId);
    revalidate(shipmentId);
    return ok({ applied: res.applied }, res.applied ? `${res.applied} new carrier update(s) applied.` : "Already up to date with the carrier.");
  });
}

const listField = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]));

const profileSchema = z.object({
  description: optionalText(2000),
  services: listField.pipe(z.array(z.enum(LOGISTICS_SERVICES))),
  modes: listField.pipe(z.array(z.enum(SHIPMENT_MODES))),
  countries: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c))),
  phone: optionalText(40),
  email: optionalText(160),
  website: optionalText(200),
  address: optionalText(300),
});

/** Services, modes and coverage shown to suppliers choosing a partner; contact details on the company. */
export async function partnerSaveProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company, provider } = await requirePartner({ permission: "company.profile.write" });
    const parsed = parseInput(profileSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    await db.update(logisticsProviders).set({ description: d.description, services: d.services, modes: d.modes, countries: d.countries.length ? d.countries : ["VN"] }).where(eq(logisticsProviders.id, provider.id));
    await db.update(companies).set({ phone: d.phone, email: d.email, website: d.website, address: d.address }).where(eq(companies.id, company.id));
    await audit({ actorId: user.id, action: "partner.profile.update", entityType: "logisticsProvider", entityId: provider.id, after: { services: d.services, modes: d.modes, countries: d.countries } });
    revalidatePath("/[locale]/partner/profile", "page");
    return ok(undefined, "Profile saved.");
  });
}

/** Rotate the secret carriers (GHN / GHTK) use to call our webhook for this partner. Shown once. */
export async function partnerRotateWebhookTokenAction(_prev: ActionResult<{ token: string }> | null, _formData: FormData): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const { user, provider } = await requirePartner({ permission: "company.apikeys.manage" });
    const token = randomBytes(24).toString("base64url");
    const apiConfig = { ...(provider.apiConfig ?? {}), webhookTokenHash: sha256(token), webhookTokenCreatedAt: new Date().toISOString() };
    await db.update(logisticsProviders).set({ apiConfig }).where(eq(logisticsProviders.id, provider.id));
    await audit({ actorId: user.id, action: "partner.webhook.rotate", entityType: "logisticsProvider", entityId: provider.id });
    revalidatePath("/[locale]/partner/integrations", "page");
    return ok({ token }, "New webhook token created — update it in your carrier accounts.");
  });
}

const credentialsSchema = z.object({
  ghnToken: optionalText(200),
  ghnShopId: optionalText(40),
  ghtkToken: optionalText(200),
});

/** The partner's own GHN / GHTK API tokens, used for "sync by tracking number". Blank keeps the saved value. */
export async function partnerSaveCarrierCredentialsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, provider } = await requirePartner({ permission: "company.apikeys.manage" });
    const parsed = parseInput(credentialsSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const cfg = { ...(provider.apiConfig ?? {}) } as Record<string, unknown>;
    const ghn = { ...((cfg.ghn as Record<string, unknown> | undefined) ?? {}) };
    const ghtk = { ...((cfg.ghtk as Record<string, unknown> | undefined) ?? {}) };
    if (parsed.data.ghnToken) ghn.token = parsed.data.ghnToken;
    if (parsed.data.ghnShopId !== null) ghn.shopId = parsed.data.ghnShopId;
    if (parsed.data.ghtkToken) ghtk.token = parsed.data.ghtkToken;
    cfg.ghn = ghn;
    cfg.ghtk = ghtk;
    await db.update(logisticsProviders).set({ apiConfig: cfg }).where(eq(logisticsProviders.id, provider.id));
    await audit({ actorId: user.id, action: "partner.carrier.credentials", entityType: "logisticsProvider", entityId: provider.id, after: { ghn: !!ghn.token, ghtk: !!ghtk.token } });
    revalidatePath("/[locale]/partner/integrations", "page");
    return ok(undefined, "Carrier credentials saved.");
  });
}
