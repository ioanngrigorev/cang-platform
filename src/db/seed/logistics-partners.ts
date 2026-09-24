import { and, desc, eq, isNull, max, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, companyMembers, logisticsProviders, orders, shipmentEvents, shipments, users } from "@/db/schema";
import { shipmentNumber } from "@/lib/ids";
import { hashPassword } from "@/modules/auth/password";

/**
 * Demo logistics partner (idempotent; runs on every seed, also when the marketplace already exists):
 *   ops@saigonfreight.vn     — dispatcher (OWNER) of Saigon Freight Solutions, partner portal /partner
 *   driver@saigonfreight.vn  — driver (STAFF), can only report statuses
 * Links the SAIGON_FREIGHT provider to the company, hands it the in-transit sea shipment and books a
 * truckload for the Hoang Gia LED order so the whole pickup → delivery flow can be tried.
 */
export async function seedLogisticsPartners(db: Db) {
  const [provider] = await db.select().from(logisticsProviders).where(eq(logisticsProviders.code, "SAIGON_FREIGHT")).limit(1);
  if (!provider) return;

  // Every shipment should know when it was last updated (drives the "no update for 48 h" alerts).
  await db.execute(sql`update shipments s set last_event_at = e.last from (select shipment_id, max(occurred_at) as last from shipment_events group by shipment_id) e where e.shipment_id = s.id and s.last_event_at is null`);

  let company = await db.query.companies.findFirst({ where: eq(companies.slug, "saigon-freight-solutions") });
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({
        slug: "saigon-freight-solutions",
        name: "Saigon Freight Solutions",
        legalName: "Công ty TNHH Giải pháp Vận tải Sài Gòn (demo)",
        businessType: "LOGISTICS_PROVIDER",
        isLogisticsPartner: true,
        isBuyer: false,
        isSeller: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
        countryCode: "VN",
        city: "Ho Chi Minh City",
        address: "Lô B3, KCN Cát Lái, TP. Thủ Đức",
        phone: "+84 28 3742 8800",
        email: "ops@saigonfreight.vn",
        website: "https://saigonfreight.example",
      })
      .returning();
  }
  if (!company.isLogisticsPartner) await db.update(companies).set({ isLogisticsPartner: true }).where(eq(companies.id, company.id));
  if (!provider.companyId) await db.update(logisticsProviders).set({ companyId: company.id, isActive: true }).where(eq(logisticsProviders.id, provider.id));

  const passwordHash = await hashPassword(process.env.SEED_DEMO_PASSWORD ?? "Password123!");
  const people = [
    { email: "ops@saigonfreight.vn", name: "Trần Văn Hải", role: "OWNER" as const, title: "Dispatcher" },
    { email: "driver@saigonfreight.vn", name: "Lê Văn Tài", role: "STAFF" as const, title: "Driver" },
  ];
  for (const p of people) {
    let user = await db.query.users.findFirst({ where: eq(users.email, p.email) });
    if (!user) {
      [user] = await db.insert(users).values({ email: p.email, name: p.name, passwordHash, locale: "vi", status: "ACTIVE", emailVerifiedAt: new Date() }).returning();
    }
    const [member] = await db.select({ id: companyMembers.id }).from(companyMembers).where(and(eq(companyMembers.companyId, company.id), eq(companyMembers.userId, user.id))).limit(1);
    if (!member) await db.insert(companyMembers).values({ companyId: company.id, userId: user.id, role: p.role, status: "ACTIVE", isPrimary: true, title: p.title });
  }

  // The sea shipment currently in transit is worked by the partner.
  const [inTransit] = await db.select({ id: shipments.id }).from(shipments).where(and(eq(shipments.status, "IN_TRANSIT"), isNull(shipments.assignedAt))).orderBy(desc(shipments.createdAt)).limit(1);
  if (inTransit) await db.update(shipments).set({ providerId: provider.id, assignedAt: new Date() }).where(eq(shipments.id, inTransit.id));

  // A domestic truckload waiting for pickup: Hoang Gia's LED high-bay order from BrightViet (in production).
  const buyer = await db.query.companies.findFirst({ where: eq(companies.slug, "hoang-gia-industrial-supply") });
  if (buyer) {
    const [order] = await db.select().from(orders).where(and(eq(orders.buyerCompanyId, buyer.id), eq(orders.statusCode, "PRODUCTION"))).limit(1);
    if (order) {
      const [existing] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.orderId, order.id)).limit(1);
      if (!existing) {
        const now = Date.now();
        const [s] = await db
          .insert(shipments)
          .values({
            shipmentNumber: shipmentNumber(),
            orderId: order.id,
            providerId: provider.id,
            assignedAt: new Date(now - 2 * 3600 * 1000),
            status: "BOOKED",
            mode: "ROAD",
            carrierCode: "OTHER",
            carrier: "Saigon Freight Solutions — own fleet",
            incoterm: order.incoterm,
            destinationAddress: order.shippingAddress,
            originPort: null,
            destinationPort: null,
            packages: 48,
            grossWeightKg: 1860,
            volumeCbm: 14.4,
            etd: new Date(now + 2 * 86400 * 1000),
            eta: new Date(now + 4 * 86400 * 1000),
            currency: order.currency,
            lastEventAt: new Date(now - 2 * 3600 * 1000),
            notes: "Truckload Binh Duong → Hanoi, tail-lift required at delivery.",
          })
          .returning();
        await db.insert(shipmentEvents).values({ shipmentId: s.id, milestone: "FACTORY", status: "BOOKED", description: "Booked with Saigon Freight Solutions", source: "manual", occurredAt: new Date(now - 2 * 3600 * 1000) });
      }
    }
  }
  const [{ n }] = await db.select({ n: max(shipments.createdAt) }).from(shipments).where(eq(shipments.providerId, provider.id));
  console.log(`  partner ${company.name} linked to ${provider.code}${n ? "" : " (no shipments yet)"}`);
}
