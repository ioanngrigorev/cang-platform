import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { disputes, documents, orders, quotations, rfqs, shipments } from "@/db/schema";
import { getAuth } from "@/modules/auth/current-user";
import { isStaff } from "@/modules/auth/rbac";
import { storage } from "@/modules/storage";

type Doc = typeof documents.$inferSelect;

/**
 * Can `companyIds` (the viewer's companies) see this document?
 *  PUBLIC        → everyone
 *  COMPANY/PRIVATE → owner company members (PRIVATE additionally the uploader only)
 *  COUNTERPARTY  → owner company + the other party of the linked order / RFQ / quotation / dispute / shipment
 *  ADMIN         → platform staff only
 */
async function canView(doc: Doc, viewer: { userId: string; companyIds: string[]; staff: boolean }): Promise<boolean> {
  if (viewer.staff) return true;
  if (doc.visibility === "ADMIN") return false;
  if (doc.visibility === "PRIVATE") return doc.uploadedById === viewer.userId;
  const owns = !!doc.ownerCompanyId && viewer.companyIds.includes(doc.ownerCompanyId);
  if (owns || doc.uploadedById === viewer.userId) return true;
  if (doc.visibility !== "COUNTERPARTY") return false;

  const parties = new Set<string>();
  if (doc.orderId) {
    const [o] = await db.select({ b: orders.buyerCompanyId, s: orders.supplierCompanyId }).from(orders).where(eq(orders.id, doc.orderId)).limit(1);
    if (o) parties.add(o.b).add(o.s);
  }
  if (doc.rfqId) {
    const [r] = await db.select({ b: rfqs.buyerCompanyId }).from(rfqs).where(eq(rfqs.id, doc.rfqId)).limit(1);
    if (r) parties.add(r.b);
    // Suppliers may view RFQ attachments only for RFQs they can see; public RFQ attachments are readable by any seller.
    const [rfq] = await db.select({ visibility: rfqs.visibility, status: rfqs.status }).from(rfqs).where(eq(rfqs.id, doc.rfqId)).limit(1);
    if (rfq?.visibility === "PUBLIC" && rfq.status !== "DRAFT" && viewer.companyIds.length > 0) return true;
  }
  if (doc.quotationId) {
    const q = await db.query.quotations.findFirst({ where: eq(quotations.id, doc.quotationId), columns: { supplierCompanyId: true }, with: { rfq: { columns: { buyerCompanyId: true } } } });
    if (q) parties.add(q.supplierCompanyId).add(q.rfq.buyerCompanyId);
  }
  if (doc.disputeId) {
    const [d] = await db.select({ a: disputes.raisedByCompanyId, b: disputes.respondentCompanyId }).from(disputes).where(eq(disputes.id, doc.disputeId)).limit(1);
    if (d) parties.add(d.a).add(d.b);
  }
  if (doc.shipmentId) {
    const s = await db.query.shipments.findFirst({ where: eq(shipments.id, doc.shipmentId), columns: {}, with: { order: { columns: { buyerCompanyId: true, supplierCompanyId: true } } } });
    if (s?.order) parties.add(s.order.buyerCompanyId).add(s.order.supplierCompanyId);
  }
  return viewer.companyIds.some((id) => parties.has(id));
}

/** Serves locally stored uploads with visibility checks. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const storageKey = key.join("/");
  const [doc] = await db.select().from(documents).where(eq(documents.storageKey, storageKey)).limit(1);
  if (!doc || doc.deletedAt) return new NextResponse("Not found", { status: 404 });

  if (doc.visibility !== "PUBLIC") {
    const auth = await getAuth();
    if (!auth) return new NextResponse("Unauthorized", { status: 401 });
    const allowed = await canView(doc, { userId: auth.user.id, companyIds: auth.memberships.map((m) => m.companyId), staff: isStaff(auth.user.platformRole) });
    if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  }

  const file = await storage().get(storageKey);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "content-type": doc.mimeType,
      "content-length": String(file.data.byteLength),
      "content-disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "cache-control": doc.visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
