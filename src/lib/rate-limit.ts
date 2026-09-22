/**
 * Simple sliding-window rate limiter.
 * In-memory by default (single instance); swap the store for Redis (REDIS_URL) in multi-instance deployments
 * by implementing RateLimitStore — the call sites do not change.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 50_000) this.gc(now);
      return fresh;
    }
    b.count += 1;
    return b;
  }
  private gc(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __cangRateLimitStore: RateLimitStore | undefined;
}

const store: RateLimitStore = globalThis.__cangRateLimitStore ?? new MemoryStore();
globalThis.__cangRateLimitStore = store;

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

export async function rateLimit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult> {
  const { count, resetAt } = await store.hit(key, opts.windowMs);
  return { allowed: count <= opts.limit, remaining: Math.max(0, opts.limit - count), resetAt };
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  otp: { limit: 5, windowMs: 10 * 60 * 1000 },
  message: { limit: 60, windowMs: 60 * 1000 },
  rfq: { limit: 20, windowMs: 60 * 60 * 1000 },
  upload: { limit: 60, windowMs: 60 * 60 * 1000 },
  api: { limit: 600, windowMs: 60 * 1000 },
} as const;
