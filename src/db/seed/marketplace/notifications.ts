/**
 * Step 7 — in-app notifications for the demo buyer (Nordwind), the demo seller (Saigon Pack) and the admin.
 */
import type { Db } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationType } from "@/modules/notifications/service";
import { insertAll, type World } from "./context";

type NotificationRow = typeof notifications.$inferInsert;

export async function seedNotifications(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const nordwind = w.buyer("nordwind-outdoor");
  const saigonPack = w.supplier("saigon-pack-manufacturing");
  const backpackRfq = w.rfq("nordwind-backpacks");
  const spV2 = w.quotation("sp-backpacks-v2");
  const dnQuote = w.quotation("dn-backpacks");
  const dvQuote = w.quotation("dv-backpacks");
  const qcOrder = w.order("nordwind-laptop-backpacks-qc");
  const jacketsOrder = w.order("nordwind-rain-jackets-completed");
  const cartonsRfq = w.rfq("nordwind-cartons");
  const disputedOrder = w.order("harbour-leggings-disputed");
  const rows: NotificationRow[] = [];

  const push = (userId: string, type: NotificationType, title: string, body: string, link: string | null, hoursAgo: number, read: boolean, data?: Record<string, unknown>) => {
    const createdAt = w.hoursAgo(hoursAgo);
    rows.push({ id: rng.id(), userId, type, channel: "IN_APP", title, body, link, data: data ?? null, readAt: read ? w.hoursAgo(Math.max(0, hoursAgo - rng.int(1, 12))) : null, sentAt: createdAt, createdAt });
  };

  // ---- Nordwind buyer
  const b = nordwind.ownerUserId;
  push(b, "RFQ_NEW_QUOTATION", `New quotation on ${backpackRfq.number}`, `Dai Viet Garment Export quoted US$252,600 CIF Hamburg (50 days).`, `/buyer/rfqs/${backpackRfq.id}`, 22, false, { quotationId: dvQuote.id });
  push(b, "QUOTATION_REVISED", `Saigon Pack Manufacturing revised its quotation`, `Rev. 2: US$237,074 CIF Hamburg, 50 days, framework terms included.`, `/buyer/rfqs/${backpackRfq.id}`, 48, true, { quotationId: spV2.id });
  push(b, "MESSAGE_NEW", "New message from Saigon Pack Manufacturing", "PP samples in both styles and three colourways can ship on 6 October by DHL…", `/buyer/messages`, 5, false);
  push(b, "RFQ_NEW_QUOTATION", `New quotation on ${backpackRfq.number}`, `Da Nang Outdoor Gear quoted US$257,600 CIF Hamburg (60 days).`, `/buyer/rfqs/${backpackRfq.id}`, 70, true, { quotationId: dnQuote.id });
  push(b, "INSPECTION_UPDATE", `Inspection scheduled for order ${qcOrder.number}`, "Vietnam Quality Control Services will inspect 300 cartons at Saigon Pack in 2 days.", `/buyer/orders/${qcOrder.id}`, 60, true);
  push(b, "PAYMENT_PAID", "Your payment was confirmed", `70% balance before shipment for order ${qcOrder.number} is confirmed and held under Trade Assurance.`, `/buyer/orders/${qcOrder.id}`, 72, true);
  push(b, "RFQ_NEW_QUOTATION", `New quotation on ${cartonsRfq.number}`, "Saigon Carton & Packaging quoted US$16,850 DAP Vinh Loc (12 days).", `/buyer/rfqs/${cartonsRfq.id}`, 26, false);
  push(b, "ORDER_STATUS", `Order ${jacketsOrder.number}: Completed`, "Thank you for confirming delivery. Funds have been released to Da Nang Outdoor Gear.", `/buyer/orders/${jacketsOrder.id}`, 41 * 24, true);
  push(b, "SYSTEM", "Two freight quotes received", "Saigon Freight Solutions and NorthStar Logistics quoted your Cat Lai → Hamburg request.", `/buyer/logistics`, 24, false);

  // ---- Saigon Pack seller
  const s = saigonPack.ownerUserId;
  push(s, "MESSAGE_NEW", "New message from Nordwind Outdoor GmbH", "Received — we are reviewing rev. 2 with our finance team this week…", `/seller/messages`, 26, true);
  push(s, "RFQ_INVITATION", `You were invited to quote: ${backpackRfq.title}`, "20,000 pieces · ship to DE · deadline in 10 days.", `/seller/rfqs/${backpackRfq.id}`, 140, true);
  push(s, "RFQ_NEW_MATCH", `New RFQ matches your capabilities: ${cartonsRfq.title}`, "25,000 pieces requested · ship to VN. Submit your quotation before it closes.", `/seller/rfqs/${cartonsRfq.id}`, 70, true);
  push(s, "PAYMENT_PAID", `Payment received for order ${qcOrder.number}`, "70% balance before shipment: USD 41,160 (held under Trade Assurance).", `/seller/orders/${qcOrder.id}`, 72, false);
  push(s, "INSPECTION_UPDATE", `Pre-shipment inspection booked on ${qcOrder.number}`, "VQC inspector confirmed for the day after tomorrow, 09:00 at Vinh Loc IP.", `/seller/orders/${qcOrder.id}`, 60, false);
  push(s, "FINANCING_UPDATE", "Financing offer received: US$35,000 production financing", "Vietnam Trade Bank offered 90 days at 12% p.a.; valid for 10 days.", `/seller/financing`, 15 * 24, true);
  push(s, "REVIEW_RECEIVED", "New 5-star review from Nordwind Outdoor GmbH", "“Sample room is the best we have worked with in Vietnam.”", `/seller/reviews`, 12 * 24, true);
  push(s, "VERIFICATION_STATUS", "Factory audit badge renewed", "Your Factory Audited badge is valid for another 24 months.", `/seller/verification`, 30 * 24, true);
  push(s, "SYSTEM", "Featured Product campaign: 1,420 impressions this week", "Your TrailRidge 35L listing received 96 clicks and 4 inquiries.", `/seller/advertising`, 8, false);

  // ---- admin
  const a = w.adminUserId;
  push(a, "VERIFICATION_STATUS", "6 KYB applications awaiting review", "Oldest: Mekong Travel Gear, submitted 12 days ago.", `/admin/verifications`, 6, false);
  push(a, "DISPUTE_UPDATE", `Dispute on order ${disputedOrder.number} needs a mediator`, "Harbour & Finch vs Phoenix Activewear — QUALITY, claimed US$12,180. Respond-by date in 5 days.", `/admin/disputes`, 9 * 24, false);
  push(a, "PRODUCT_MODERATION", "4 products pending review", "Includes Dai Viet Garment Export — Recycled Polyester Fleece Quarter-Zip.", `/admin/products?status=PENDING_REVIEW`, 30, false);
  push(a, "PAYMENT_PAID", "Payment confirmation queue", "1 pending bank transfer to match: Trailhead Supply Co. deposit on order " + w.order("trailhead-totes-payment").number + ".", `/admin/payments`, 48, true);
  push(a, "SYSTEM", "Weekly platform digest", "14 RFQs, 22 quotations, 3 orders placed and US$186k GMV in the last 7 days.", `/admin`, 3 * 24, true);

  await insertAll(db, notifications, rows);
  console.log(`  notifications: ${rows.length}`);
}
