import "server-only";
import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { financingApplications, financingProviders } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type FinancingTab = "open" | "offered" | "funded" | "closed" | "all";
export const FINANCING_TABS: FinancingTab[] = ["open", "offered", "funded", "closed", "all"];
const TAB_STATUS: Record<Exclude<FinancingTab, "all">, Array<typeof financingApplications.$inferSelect.status>> = {
  open: ["SUBMITTED", "ROUTED", "UNDER_REVIEW"],
  offered: ["OFFERED", "ACCEPTED"],
  funded: ["FUNDED", "REPAYING"],
  closed: ["REPAID", "DECLINED", "DEFAULTED", "CANCELLED", "WITHDRAWN", "DRAFT"],
};

export async function listFinancingApplications(f: { tab: FinancingTab; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.tab !== "all") conds.push(inArray(financingApplications.status, TAB_STATUS[f.tab]));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.query.financingApplications.findMany({
      where,
      with: {
        company: { columns: { id: true, name: true, countryCode: true } },
        provider: { columns: { id: true, name: true } },
        order: { columns: { id: true, orderNumber: true } },
        offers: { orderBy: (o, { desc: d }) => [d(o.createdAt)] },
      },
      orderBy: [desc(financingApplications.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ total: count() }).from(financingApplications).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function financingTabCounts(): Promise<Record<FinancingTab, number>> {
  const rows = await db.select({ status: financingApplications.status, n: count() }).from(financingApplications).groupBy(financingApplications.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { open: by(TAB_STATUS.open), offered: by(TAB_STATUS.offered), funded: by(TAB_STATUS.funded), closed: by(TAB_STATUS.closed), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function listFinancingProviders() {
  return db.select().from(financingProviders).orderBy(asc(financingProviders.sortOrder), asc(financingProviders.name));
}

export async function getFinancingApplication(id: string) {
  return db.query.financingApplications.findFirst({ where: eq(financingApplications.id, id), with: { company: true, provider: true, offers: true } });
}
