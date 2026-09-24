import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, logisticsProviders, shipmentEvents, users } from "@/db/schema";

/** Shipment events newest first, with who reported them. */
export async function shipmentTimeline(shipmentId: string) {
  return db
    .select({
      id: shipmentEvents.id,
      milestone: shipmentEvents.milestone,
      status: shipmentEvents.status,
      location: shipmentEvents.location,
      description: shipmentEvents.description,
      source: shipmentEvents.source,
      reasonCode: shipmentEvents.reasonCode,
      attachments: shipmentEvents.attachments,
      data: shipmentEvents.data,
      occurredAt: shipmentEvents.occurredAt,
      actorName: users.name,
      actorCompany: companies.name,
    })
    .from(shipmentEvents)
    .leftJoin(users, eq(users.id, shipmentEvents.actorUserId))
    .leftJoin(companies, eq(companies.id, shipmentEvents.actorCompanyId))
    .where(eq(shipmentEvents.shipmentId, shipmentId))
    .orderBy(desc(shipmentEvents.occurredAt), desc(shipmentEvents.createdAt));
}
export type TimelineEvent = Awaited<ReturnType<typeof shipmentTimeline>>[number];

/** Active logistics partners suppliers can hand a shipment to (platform partners first). */
export async function listActiveProviders() {
  const rows = await db
    .select({ id: logisticsProviders.id, name: logisticsProviders.name, modes: logisticsProviders.modes, companyId: logisticsProviders.companyId })
    .from(logisticsProviders)
    .where(eq(logisticsProviders.isActive, true))
    .orderBy(asc(logisticsProviders.sortOrder), asc(logisticsProviders.name));
  return rows.map((r) => ({ id: r.id, name: r.name, modes: r.modes as string[], onPlatform: !!r.companyId }));
}
export type ProviderOption = Awaited<ReturnType<typeof listActiveProviders>>[number];
