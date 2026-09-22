/**
 * Shared state passed between the marketplace seed steps: reference ids from the platform seed,
 * the deterministic PRNG, and the ids of every demo entity created so far (keyed by slug / key).
 */
import type { PgTable } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";
import type { Db } from "@/db";
import type { BuyerSeed } from "../data/buyers";
import type { SupplierSeed } from "../data/suppliers";
import { DAY_MS, Rng, chunk } from "./rng";

export type SeedContext = {
  industryIds: Map<string, string>;
  categoryIds: Map<string, string>;
  certificationIds: Map<string, string>;
  provinceIds: Map<string, string>;
  planIds: Map<string, string>;
  badgeIds: Map<string, string>;
  paymentProviderIds: Map<string, string>;
  financingProviderIds: Map<string, string>;
  logisticsProviderIds: Map<string, string>;
  inspectionProviderIds: Map<string, string>;
  adProductIds: Map<string, string>;
};

export type SupplierRef = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  salesUserId: string | null;
  seed: SupplierSeed;
  verified: boolean;
  audited: boolean;
};

export type BuyerRef = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  seed: BuyerSeed;
};

export type ProductRef = {
  id: string;
  slug: string;
  companySlug: string;
  title: string;
  categoryId: string;
  categorySlug: string;
  unit: string;
  basePrice: number | null;
  hsCode: string | null;
  primaryImage: string;
  status: string;
};

export type RfqRef = { id: string; key: string; number: string; buyerSlug: string; title: string };
export type QuotationRef = { id: string; key: string; number: string; rfqKey: string; supplierSlug: string; total: number; currency: string; leadTimeDays: number | null };
export type OrderRef = {
  id: string;
  key: string;
  number: string;
  buyerSlug: string;
  supplierSlug: string;
  total: number;
  currency: string;
  status: string;
  placedAt: Date;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
};

export class World {
  readonly rng = new Rng();
  readonly now = new Date();
  passwordHash = "";
  adminUserId = "";
  readonly suppliers = new Map<string, SupplierRef>();
  readonly buyers = new Map<string, BuyerRef>();
  readonly products = new Map<string, ProductRef>();
  readonly rfqs = new Map<string, RfqRef>();
  readonly quotations = new Map<string, QuotationRef>();
  readonly orders = new Map<string, OrderRef>();
  /** company ids of the conversations' FILE documents etc. */
  readonly documentIds: string[] = [];
  /** loremflickr lock counter — every image URL gets a unique lock so photos differ */
  private imageLock = 1000;

  constructor(readonly ctx: SeedContext) {}

  daysAgo(days: number): Date {
    return new Date(this.now.getTime() - days * DAY_MS);
  }
  daysFromNow(days: number): Date {
    return new Date(this.now.getTime() + days * DAY_MS);
  }
  hoursAgo(hours: number): Date {
    return new Date(this.now.getTime() - hours * 3_600_000);
  }

  image(width: number, height: number, keywords: string): string {
    this.imageLock += 1;
    return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(keywords)}?lock=${this.imageLock}`;
  }

  company(slug: string): { id: string; name: string; ownerUserId: string; isSupplier: boolean } {
    const s = this.suppliers.get(slug);
    if (s) return { id: s.id, name: s.name, ownerUserId: s.ownerUserId, isSupplier: true };
    const b = this.buyers.get(slug);
    if (b) return { id: b.id, name: b.name, ownerUserId: b.ownerUserId, isSupplier: false };
    throw new Error(`seed: unknown company slug "${slug}"`);
  }

  supplier(slug: string): SupplierRef {
    const s = this.suppliers.get(slug);
    if (!s) throw new Error(`seed: unknown supplier "${slug}"`);
    return s;
  }
  buyer(slug: string): BuyerRef {
    const b = this.buyers.get(slug);
    if (!b) throw new Error(`seed: unknown buyer "${slug}"`);
    return b;
  }
  product(slug: string): ProductRef {
    const p = this.products.get(slug);
    if (!p) throw new Error(`seed: unknown product "${slug}"`);
    return p;
  }
  rfq(key: string): RfqRef {
    const r = this.rfqs.get(key);
    if (!r) throw new Error(`seed: unknown rfq "${key}"`);
    return r;
  }
  quotation(key: string): QuotationRef {
    const q = this.quotations.get(key);
    if (!q) throw new Error(`seed: unknown quotation "${key}"`);
    return q;
  }
  order(key: string): OrderRef {
    const o = this.orders.get(key);
    if (!o) throw new Error(`seed: unknown order "${key}"`);
    return o;
  }
  category(slug: string): string {
    const id = this.ctx.categoryIds.get(slug);
    if (!id) throw new Error(`seed: unknown category "${slug}"`);
    return id;
  }
  certification(code: string): string {
    const id = this.ctx.certificationIds.get(code);
    if (!id) throw new Error(`seed: unknown certification "${code}"`);
    return id;
  }
  industry(slug: string): string {
    const id = this.ctx.industryIds.get(slug);
    if (!id) throw new Error(`seed: unknown industry "${slug}"`);
    return id;
  }
  ref(map: Map<string, string>, key: string, label: string): string {
    const id = map.get(key);
    if (!id) throw new Error(`seed: unknown ${label} "${key}"`);
    return id;
  }
}

/** Bulk insert in chunks of ≤ 500 rows. */
export async function insertAll<T extends PgTable>(db: Db, table: T, rows: InferInsertModel<T>[]): Promise<void> {
  for (const part of chunk(rows, 500)) {
    if (part.length) await db.insert(table).values(part as InferInsertModel<T>[]);
  }
}
