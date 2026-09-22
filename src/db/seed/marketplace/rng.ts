/**
 * Deterministic helpers for the demo seed: a mulberry32 PRNG, id generation and date maths.
 * Every random choice in the marketplace seed goes through this so that each run produces the
 * exact same dataset (only the business numbers from `@/lib/ids` and "now"-relative dates vary).
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export class Rng {
  private readonly next: () => number;
  private counter = 0;

  constructor(seed = 2026_09_21) {
    this.next = mulberry32(seed);
  }

  /** Float in [min, max). */
  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** Money-ish float rounded to `decimals`. */
  num(min: number, max: number, decimals = 2): number {
    const f = 10 ** decimals;
    return Math.round(this.float(min, max) * f) / f;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** `n` distinct members (or all of them when the array is shorter). */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, Math.min(n, items.length));
  }

  /** Stable, collision-free id (counter based) that looks like the cuid2 ids used elsewhere. */
  id(): string {
    this.counter += 1;
    let suffix = "";
    for (let i = 0; i < 8; i++) suffix += ID_ALPHABET[Math.floor(this.next() * ID_ALPHABET.length)];
    return `sd${this.counter.toString(36).padStart(6, "0")}${suffix}`;
  }
}

export const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** YYYY-MM-DD in UTC (for `date` columns). */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
