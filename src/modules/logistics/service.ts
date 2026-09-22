import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { logisticsProviders, logisticsQuotes, logisticsRequests, orderEvents, orders, shipments } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { logisticsRequestNumber, shipmentNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { destinationAddressOf, originAddressOf, type LogisticsRequestInput } from "./schemas";

/** Create an OPEN logistics request; matching providers (by service + country) are notified. */
export async function createLogisticsRequest(companyId: string, userId: string, input: LogisticsRequestInput) {
  if (input.orderId) {
    const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.buyerCompanyId, companyId))).limit(1);
    if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
  }
  const [row] = await db
    .insert(logisticsRequests)
    .values({
      requestNumber: logisticsRequestNumber(),
      requesterCompanyId: companyId,
      orderId: input.orderId,
      status: "OPEN",
      services: input.services,
      preferredMode: input.preferredMode,
      originAddress: originAddressOf(input),
      destinationAddress: destinationAddressOf(input),
      originCountryCode: input.originCountryCode,
      destinationCountryCode: input.destinationCountryCode,
      incoterm: (input.incoterm as typeof logisticsRequests.$inferInsert.incoterm) ?? null,
      cargoDescription: input.cargoDescription,
      hsCode: input.hsCode,
      packages: input.packages,
      grossWeightKg: input.grossWeightKg,
      volumeCbm: input.volumeCbm,
      containerType: input.containerType,
      cargoValue: input.cargoValue,
      currency: input.currency,
      insuranceRequired: input.insuranceRequired,
      readyDate: input.readyDate,
      requiredDeliveryDate: input.requiredDeliveryDate,
      quoteDeadline: input.quoteDeadline,
      notes: input.notes,
    })
    .returning();

  if (input.orderId) {
    await db.insert(orderEvents).values({
      orderId: input.orderId,
      type: "SHIPMENT",
      title: `Logistics request ${row.requestNumber} created`,
      description: `${input.services.map((s) => s.replace(/_/g, " ").toLowerCase()).join(", ")} · ${input.originCountryCode} → ${input.destinationCountryCode}`,
      actorId: userId,
      data: { logisticsRequestId: row.id },
    });
  }

  // Notify partner companies whose provider profile matches the requested services and lanes.
  const providers = await db.select().from(logisticsProviders).where(eq(logisticsProviders.isActive, true));
  const matched = providers.filter(
    (p) =>
      p.companyId &&
      p.services.some((s) => input.services.includes(s)) &&
      (p.countries.length === 0 || p.countries.includes(input.destinationCountryCode) || p.countries.includes(input.originCountryCode)),
  );
  await Promise.all(
    matched.map((p) =>
      notifyCompany(p.companyId!, {
        type: "SYSTEM",
        title: `New logistics request ${row.requestNumber}`,
        body: `${input.cargoDescription.slice(0, 120)} · ${input.originCountryCode} → ${input.destinationCountryCode}`,
        link: `/seller/logistics/${row.id}`,
        email: false,
      }),
    ),
  );
  await audit({ actorId: userId, action: "logistics.request.create", entityType: "logisticsRequest", entityId: row.id, after: { services: input.services, matched: matched.length } });
  return { request: row, matchedProviders: matched.length };
}

/**
 * Accept one quote: the quote becomes ACCEPTED, the rest REJECTED, the request BOOKED and a
 * shipment is created so the buyer can track it from the order.
 */
export async function acceptLogisticsQuote(companyId: string, userId: string, requestId: string, quoteId: string) {
  const request = await db.query.logisticsRequests.findFirst({
    where: and(eq(logisticsRequests.id, requestId), eq(logisticsRequests.requesterCompanyId, companyId)),
    with: { quotes: { with: { provider: true } } },
  });
  if (!request) throw new ActionError("Logistics request not found.", "NOT_FOUND");
  if (request.status === "BOOKED") throw new ActionError("This request is already booked.", "INVALID_STATE");
  const quote = request.quotes.find((q) => q.id === quoteId);
  if (!quote) throw new ActionError("Quote not found.", "NOT_FOUND");
  if (quote.status !== "SUBMITTED") throw new ActionError("This quote can no longer be accepted.", "INVALID_STATE");

  const created = await db.transaction(async (tx) => {
    await tx.update(logisticsQuotes).set({ status: "ACCEPTED" }).where(eq(logisticsQuotes.id, quote.id));
    const others = request.quotes.filter((q) => q.id !== quote.id && q.status === "SUBMITTED").map((q) => q.id);
    if (others.length) await tx.update(logisticsQuotes).set({ status: "REJECTED" }).where(inArray(logisticsQuotes.id, others));
    await tx.update(logisticsRequests).set({ status: "BOOKED" }).where(eq(logisticsRequests.id, request.id));

    let shipment: typeof shipments.$inferSelect | null = null;
    if (request.orderId) {
      const [s] = await tx
        .insert(shipments)
        .values({
          shipmentNumber: shipmentNumber(),
          orderId: request.orderId,
          providerId: quote.providerId,
          logisticsQuoteId: quote.id,
          status: "BOOKED",
          mode: quote.mode,
          carrier: quote.provider?.name ?? null,
          incoterm: request.incoterm,
          originAddress: request.originAddress,
          destinationAddress: request.destinationAddress,
          packages: request.packages,
          grossWeightKg: request.grossWeightKg,
          volumeCbm: request.volumeCbm,
          insured: request.insuranceRequired,
          insuranceValue: request.insuranceRequired ? request.cargoValue : null,
          cost: quote.amount,
          currency: quote.currency,
          eta: quote.transitDays ? new Date(Date.now() + quote.transitDays * 86400000) : null,
        })
        .returning();
      shipment = s;
      await tx.insert(orderEvents).values({
        orderId: request.orderId,
        type: "SHIPMENT",
        title: `Freight booked with ${quote.provider?.name ?? "a logistics partner"}`,
        description: `${quote.currency} ${quote.amount} · ${quote.mode.replace(/_/g, " ")}${quote.transitDays ? ` · ${quote.transitDays} days transit` : ""}`,
        actorId: userId,
        data: { shipmentId: s.id, logisticsQuoteId: quote.id },
      });
    }
    return shipment;
  });

  if (quote.provider?.companyId) {
    await notifyCompany(quote.provider.companyId, {
      type: "SHIPMENT_UPDATE",
      title: `Your quote for ${request.requestNumber} was accepted`,
      body: `${quote.currency} ${quote.amount} · ${quote.mode.replace(/_/g, " ")}`,
      link: `/seller/logistics/${request.id}`,
    });
  }
  await audit({ actorId: userId, action: "logistics.quote.accept", entityType: "logisticsRequest", entityId: request.id, after: { quoteId: quote.id, shipmentId: created?.id ?? null } });
  return { shipmentId: created?.id ?? null };
}

/** Cancel an open request (no bookings yet). */
export async function cancelLogisticsRequest(companyId: string, userId: string, requestId: string) {
  const [row] = await db
    .select()
    .from(logisticsRequests)
    .where(and(eq(logisticsRequests.id, requestId), eq(logisticsRequests.requesterCompanyId, companyId)))
    .limit(1);
  if (!row) throw new ActionError("Logistics request not found.", "NOT_FOUND");
  if (row.status === "BOOKED") throw new ActionError("A booked request cannot be cancelled here — contact the provider.", "INVALID_STATE");
  await db.transaction(async (tx) => {
    await tx.update(logisticsRequests).set({ status: "CANCELLED" }).where(eq(logisticsRequests.id, requestId));
    await tx.update(logisticsQuotes).set({ status: "EXPIRED" }).where(and(eq(logisticsQuotes.requestId, requestId), ne(logisticsQuotes.status, "ACCEPTED")));
  });
  await audit({ actorId: userId, action: "logistics.request.cancel", entityType: "logisticsRequest", entityId: requestId });
}
