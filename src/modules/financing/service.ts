import { and, count, desc, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  companyBadges,
  badges,
  creditScores,
  creditScoringRules,
  disputes,
  financingApplications,
  financingOffers,
  financingProviders,
  orders,
  payments,
} from "@/db/schema";
import { ActionError } from "@/lib/action";
import { financingNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany, notifyUser } from "@/modules/notifications/service";

// ---------------------------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------------------------

export type CreditFeatures = {
  completedOrders: number;
  gmv12m: number;
  disputeRate: number;
  companyAgeYears: number;
  verificationLevel: "AUDITED" | "VERIFIED" | "PENDING" | "UNVERIFIED";
  onTimePaymentRate: number | null;
  onTimeDeliveryRate: number | null;
};

const YEAR_MS = 365 * 86400000;

/** Everything the scoring rules can read, computed from the operational tables. */
export async function extractFeatures(companyId: string): Promise<CreditFeatures> {
  const partyOf = or(eq(orders.buyerCompanyId, companyId), eq(orders.supplierCompanyId, companyId));
  const twelveMonthsAgo = new Date(Date.now() - YEAR_MS);

  const [company] = await db
    .select({ createdAt: companies.createdAt, yearEstablished: companies.yearEstablished, verificationStatus: companies.verificationStatus })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) throw new ActionError("Company not found.", "NOT_FOUND");

  const [[completed], [total], [gmv], [disputeCount], [audited]] = await Promise.all([
    db.select({ n: count() }).from(orders).where(and(partyOf, eq(orders.statusCode, "COMPLETED"), isNull(orders.deletedAt))),
    db.select({ n: count() }).from(orders).where(and(partyOf, isNull(orders.deletedAt))),
    db
      .select({ sum: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
      .from(orders)
      .where(and(partyOf, gte(orders.createdAt, twelveMonthsAgo), isNull(orders.deletedAt))),
    db
      .select({ n: count() })
      .from(disputes)
      .where(or(eq(disputes.raisedByCompanyId, companyId), eq(disputes.respondentCompanyId, companyId))),
    db
      .select({ n: count() })
      .from(companyBadges)
      .innerJoin(badges, eq(badges.id, companyBadges.badgeId))
      .where(and(eq(companyBadges.companyId, companyId), eq(badges.code, "FACTORY_AUDITED"))),
  ]);

  // On-time payment: paid on or before the due date (only payments that had a due date).
  const [paymentStats] = await db
    .select({
      total: count(),
      onTime: sql<number>`coalesce(sum(case when ${payments.paidAt} <= ${payments.dueAt} then 1 else 0 end), 0)::int`,
    })
    .from(payments)
    .where(and(eq(payments.payerCompanyId, companyId), isNotNull(payments.paidAt), isNotNull(payments.dueAt)));

  // On-time delivery: orders this company shipped, delivered before the promised date.
  const [deliveryStats] = await db
    .select({
      total: count(),
      onTime: sql<number>`coalesce(sum(case when ${orders.deliveredAt} <= ${orders.expectedDeliveryDate} then 1 else 0 end), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.supplierCompanyId, companyId), isNotNull(orders.deliveredAt), isNotNull(orders.expectedDeliveryDate), isNull(orders.deletedAt)));

  const ageYears = company.yearEstablished
    ? Math.max(0, new Date().getFullYear() - company.yearEstablished)
    : Math.max(0, (Date.now() - company.createdAt.getTime()) / YEAR_MS);

  const verificationLevel: CreditFeatures["verificationLevel"] =
    audited.n > 0 && company.verificationStatus === "VERIFIED"
      ? "AUDITED"
      : company.verificationStatus === "VERIFIED"
        ? "VERIFIED"
        : company.verificationStatus === "PENDING" || company.verificationStatus === "IN_REVIEW"
          ? "PENDING"
          : "UNVERIFIED";

  return {
    completedOrders: completed.n,
    gmv12m: Math.round(gmv.sum * 100) / 100,
    disputeRate: total.n > 0 ? Math.round((disputeCount.n / total.n) * 10000) / 10000 : 0,
    companyAgeYears: Math.round(ageYears * 10) / 10,
    verificationLevel,
    onTimePaymentRate: paymentStats.total > 0 ? Math.round((paymentStats.onTime / paymentStats.total) * 100) / 100 : null,
    onTimeDeliveryRate: deliveryStats.total > 0 ? Math.round((deliveryStats.onTime / deliveryStats.total) * 100) / 100 : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------------------------

type Bucket = { min?: number; max?: number; points: number };
type RuleConfig = { buckets?: Bucket[]; map?: Record<string, number> };

/** Points a single rule awards for a feature value (null = no data → neutral half weight). */
function pointsFor(config: RuleConfig, value: unknown): { points: number; max: number; noData: boolean } {
  if (config.map) {
    const values = Object.values(config.map);
    const max = values.length ? Math.max(...values) : 0;
    if (value === null || value === undefined) return { points: max / 2, max, noData: true };
    return { points: config.map[String(value)] ?? 0, max, noData: false };
  }
  const buckets = config.buckets ?? [];
  const max = buckets.length ? Math.max(...buckets.map((b) => b.points)) : 0;
  if (value === null || value === undefined || typeof value !== "number" || Number.isNaN(value)) {
    return { points: max / 2, max, noData: true };
  }
  // "min" buckets: highest matching threshold wins. "max" buckets: lowest matching ceiling wins.
  const minMatches = buckets.filter((b) => b.min !== undefined && value >= b.min!).sort((a, b) => b.min! - a.min!);
  if (minMatches.length) return { points: minMatches[0].points, max, noData: false };
  const maxMatches = buckets.filter((b) => b.max !== undefined && value <= b.max!).sort((a, b) => a.max! - b.max!);
  if (maxMatches.length) return { points: maxMatches[0].points, max, noData: false };
  return { points: 0, max, noData: false };
}

export function gradeFor(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

export type CreditScoreSnapshot = typeof creditScores.$inferSelect;

/**
 * Compute a 0–100 credit score from the active, admin-configurable scoring rules and store a snapshot.
 * Each rule maps one feature to points (capped by its weight); the score is the weighted sum.
 */
export async function scoreCompany(companyId: string): Promise<CreditScoreSnapshot> {
  const [features, rules] = await Promise.all([
    extractFeatures(companyId),
    db.select().from(creditScoringRules).where(eq(creditScoringRules.isActive, true)).orderBy(creditScoringRules.code),
  ]);
  const breakdown: Array<{ rule: string; value: unknown; points: number }> = [];
  let score = 0;
  let weightTotal = 0;
  const version = rules[0]?.version ?? "v1";

  for (const rule of rules) {
    const value = (features as Record<string, unknown>)[rule.feature] ?? null;
    const { points, max } = pointsFor((rule.config ?? {}) as RuleConfig, value);
    const weight = rule.weight ?? 0;
    weightTotal += weight;
    // Rules are seeded with points already expressed in weight units; normalise defensively.
    const contribution = max > 0 ? (points / max) * weight : 0;
    score += contribution;
    breakdown.push({ rule: rule.code, value, points: Math.round(contribution * 10) / 10 });
  }
  const normalised = weightTotal > 0 ? (score / weightTotal) * 100 : 0;
  const finalScore = Math.max(0, Math.min(100, Math.round(normalised)));

  const [snapshot] = await db
    .insert(creditScores)
    .values({
      companyId,
      score: finalScore,
      grade: gradeFor(finalScore),
      version,
      features: features as unknown as Record<string, number | string | boolean | null>,
      breakdown,
    })
    .returning();
  return snapshot;
}

/** Most recent snapshot, computing a fresh one when it is missing or older than `maxAgeDays`. */
export async function currentCreditScore(companyId: string, maxAgeDays = 7): Promise<CreditScoreSnapshot> {
  const [latest] = await db.select().from(creditScores).where(eq(creditScores.companyId, companyId)).orderBy(desc(creditScores.computedAt)).limit(1);
  if (latest && Date.now() - latest.computedAt.getTime() < maxAgeDays * 86400000) return latest;
  return scoreCompany(companyId);
}

// ---------------------------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------------------------

type RoutingRules = { minCreditScore?: number; side?: "BUYER" | "SELLER"; allowedIndustries?: string[] };

export type RoutingResult =
  | { matched: true; providerId: string; providerName: string; score: number; grade: string }
  | { matched: false; reason: string; score: number; grade: string };

/**
 * Route a submitted application to a licensed partner. CANG never lends: it scores the company,
 * matches it against each partner's published appetite and hands the file over.
 */
export async function routeApplication(applicationId: string): Promise<RoutingResult> {
  const app = await db.query.financingApplications.findFirst({
    where: eq(financingApplications.id, applicationId),
    with: { company: { columns: { id: true, name: true, countryCode: true } } },
  });
  if (!app) throw new ActionError("Application not found.", "NOT_FOUND");

  const snapshot = await currentCreditScore(app.companyId, 1);
  const providers = await db.select().from(financingProviders).where(eq(financingProviders.isActive, true)).orderBy(financingProviders.sortOrder);

  const candidates = providers.filter((p) => {
    const rules = (p.routingRules ?? {}) as RoutingRules;
    if (!p.products.includes(app.productType)) return false;
    if (p.countries.length > 0 && !p.countries.includes(app.company.countryCode)) return false;
    if (p.currencies.length > 0 && !p.currencies.includes(app.currency)) return false;
    if (p.minAmount != null && app.amount < p.minAmount) return false;
    if (p.maxAmount != null && app.amount > p.maxAmount) return false;
    if (rules.side && rules.side !== app.side) return false;
    if (rules.minCreditScore != null && snapshot.score < rules.minCreditScore) return false;
    return true;
  });

  const riskCommon = { riskScore: snapshot.score, riskGrade: snapshot.grade, riskScoreVersion: snapshot.version, riskFactors: snapshot.features as Record<string, unknown> };

  if (!candidates.length) {
    const reason = `No partner currently matches this request (score ${snapshot.score}/${snapshot.grade}, ${app.currency} ${app.amount}, ${app.company.countryCode}). Our team will review it manually.`;
    await db
      .update(financingApplications)
      .set({ ...riskCommon, status: "SUBMITTED", notes: reason })
      .where(eq(financingApplications.id, applicationId));
    await audit({ action: "financing.route.noMatch", actorType: "SYSTEM", entityType: "financingApplication", entityId: applicationId, after: { score: snapshot.score } });
    return { matched: false, reason, score: snapshot.score, grade: snapshot.grade };
  }

  // Prefer the partner with the tightest appetite the applicant still clears (best pricing signal).
  const provider = candidates.sort((a, b) => {
    const am = ((a.routingRules ?? {}) as RoutingRules).minCreditScore ?? 0;
    const bm = ((b.routingRules ?? {}) as RoutingRules).minCreditScore ?? 0;
    return bm - am || a.sortOrder - b.sortOrder;
  })[0];

  await db
    .update(financingApplications)
    .set({ ...riskCommon, providerId: provider.id, status: "ROUTED", routedAt: new Date(), notes: null })
    .where(eq(financingApplications.id, applicationId));
  await audit({ action: "financing.route", actorType: "SYSTEM", entityType: "financingApplication", entityId: applicationId, after: { providerId: provider.id, score: snapshot.score } });
  return { matched: true, providerId: provider.id, providerName: provider.name, score: snapshot.score, grade: snapshot.grade };
}

/** "1.0% – 1.8% / 30 days" → 1.0 (monthly percent). */
function parseMonthlyRate(indicative: string | null): number {
  const m = indicative?.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 1.5;
}

/**
 * Manual-adapter partners publish an indicative offer immediately; API partners would deliver theirs
 * through their adapter. The offer is clearly indicative and subject to the partner's final approval.
 */
export async function issueIndicativeOffer(applicationId: string) {
  const app = await db.query.financingApplications.findFirst({ where: eq(financingApplications.id, applicationId), with: { provider: true, offers: true } });
  if (!app?.provider || app.offers.length) return null;
  if (app.provider.adapterCode !== "manual") return null;
  const monthly = parseMonthlyRate(app.provider.indicativeRate);
  const tenorDays = Math.min(Math.max(app.requestedTenorDays ?? 90, app.provider.minTenorDays ?? 30), app.provider.maxTenorDays ?? 180);
  const feePercent = 1;
  const feeAmount = Math.round(app.amount * (feePercent / 100) * 100) / 100;
  const [offer] = await db
    .insert(financingOffers)
    .values({
      applicationId: app.id,
      providerId: app.provider.id,
      status: "OFFERED",
      amount: app.amount,
      currency: app.currency,
      interestRate: Math.round(monthly * 12 * 100) / 100,
      feePercent,
      feeAmount,
      tenorDays,
      repaymentSchedule: [
        {
          dueAt: new Date(Date.now() + tenorDays * 86400000).toISOString(),
          amount: Math.round((app.amount * (1 + (monthly / 100) * (tenorDays / 30)) + feeAmount) * 100) / 100,
        },
      ],
      terms: `Indicative offer from ${app.provider.name}. Rate ${app.provider.indicativeRate ?? `${monthly}% / month`}, origination fee ${feePercent}%. Subject to the partner's final credit approval and documentation.`,
      validUntil: new Date(Date.now() + 14 * 86400000),
    })
    .returning();
  await db.update(financingApplications).set({ status: "OFFERED" }).where(eq(financingApplications.id, app.id));
  await notifyCompany(app.companyId, {
    type: "FINANCING_UPDATE",
    title: `Indicative offer received for ${app.applicationNumber}`,
    body: `${app.provider.name} · ${app.currency} ${app.amount} over ${tenorDays} days.`,
    link: `/buyer/financing/${app.id}`,
  });
  return offer;
}

// ---------------------------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------------------------

export type FinancingApplicationInput = {
  orderId: string | null;
  productType: typeof financingApplications.$inferInsert.productType;
  amount: number;
  currency: string;
  requestedTenorDays: number;
  purpose: string | null;
  annualRevenue: number | null;
  receivables: number | null;
  notes: string | null;
  documentIds: string[];
};

/** Create a SUBMITTED application, score the company and route it in one step. */
export async function submitFinancingApplication(companyId: string, userId: string, input: FinancingApplicationInput) {
  if (input.orderId) {
    const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.buyerCompanyId, companyId))).limit(1);
    if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
  }
  const [app] = await db
    .insert(financingApplications)
    .values({
      applicationNumber: financingNumber(),
      companyId,
      orderId: input.orderId,
      side: "BUYER",
      productType: input.productType,
      status: "SUBMITTED",
      amount: input.amount,
      currency: input.currency,
      purpose: input.purpose,
      requestedTenorDays: input.requestedTenorDays,
      financialData: { annualRevenue: input.annualRevenue, receivables: input.receivables, declaredBy: userId },
      notes: input.notes,
      submittedAt: new Date(),
    })
    .returning();

  if (input.documentIds.length) {
    const { documents } = await import("@/db/schema");
    await db
      .update(documents)
      .set({ financingApplicationId: app.id, visibility: "ADMIN", type: "FINANCIAL_STATEMENT" })
      .where(and(inArray(documents.id, input.documentIds), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)));
  }

  await audit({ actorId: userId, action: "financing.apply", entityType: "financingApplication", entityId: app.id, after: { amount: app.amount, productType: app.productType } });
  const routing = await routeApplication(app.id);
  if (routing.matched) await issueIndicativeOffer(app.id);
  await notifyUser(userId, {
    type: "FINANCING_UPDATE",
    title: routing.matched ? `Application ${app.applicationNumber} routed to ${routing.providerName}` : `Application ${app.applicationNumber} received`,
    body: routing.matched ? `Credit score ${routing.score} (grade ${routing.grade}).` : routing.reason,
    link: `/buyer/financing/${app.id}`,
    email: false,
  });
  return { application: app, routing };
}

export async function acceptFinancingOffer(companyId: string, userId: string, applicationId: string, offerId: string) {
  const app = await db.query.financingApplications.findFirst({
    where: and(eq(financingApplications.id, applicationId), eq(financingApplications.companyId, companyId)),
    with: { offers: true, provider: true },
  });
  if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
  const offer = app.offers.find((o) => o.id === offerId);
  if (!offer) throw new ActionError("Offer not found.", "NOT_FOUND");
  if (offer.status !== "OFFERED") throw new ActionError("This offer is no longer available.", "INVALID_STATE");
  await db.transaction(async (tx) => {
    await tx.update(financingOffers).set({ status: "ACCEPTED", acceptedAt: new Date() }).where(eq(financingOffers.id, offer.id));
    const others = app.offers.filter((o) => o.id !== offer.id && o.status === "OFFERED").map((o) => o.id);
    if (others.length) await tx.update(financingOffers).set({ status: "REJECTED" }).where(inArray(financingOffers.id, others));
    await tx
      .update(financingApplications)
      .set({ status: "ACCEPTED", acceptedOfferId: offer.id, decidedAt: new Date() })
      .where(eq(financingApplications.id, app.id));
  });
  await audit({ actorId: userId, action: "financing.offer.accept", entityType: "financingApplication", entityId: app.id, after: { offerId: offer.id } });
  return offer;
}

export async function withdrawFinancingApplication(companyId: string, userId: string, applicationId: string) {
  const [app] = await db
    .select()
    .from(financingApplications)
    .where(and(eq(financingApplications.id, applicationId), eq(financingApplications.companyId, companyId)))
    .limit(1);
  if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
  if (["FUNDED", "REPAYING", "REPAID", "WITHDRAWN", "CANCELLED"].includes(app.status)) {
    throw new ActionError("This application can no longer be withdrawn.", "INVALID_STATE");
  }
  await db.transaction(async (tx) => {
    await tx.update(financingApplications).set({ status: "WITHDRAWN" }).where(eq(financingApplications.id, applicationId));
    await tx.update(financingOffers).set({ status: "WITHDRAWN" }).where(and(eq(financingOffers.applicationId, applicationId), eq(financingOffers.status, "OFFERED")));
  });
  await audit({ actorId: userId, action: "financing.withdraw", entityType: "financingApplication", entityId: applicationId });
}
