import { createHash } from "node:crypto";
import Redis from "ioredis";
/**
 * Atomic fixed-window rate limiter.
 * Uses shared Redis when REDIS_URL is configured; bounded process-local storage otherwise.
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
      if (this.buckets.size >= 50_000) this.gc(now);
      if (this.buckets.size >= 50_000) return { count: Number.MAX_SAFE_INTEGER, resetAt: now + windowMs };
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 50_000) this.gc(now);
      return { ...fresh };
    }
    b.count += 1;
    return { ...b };
  }
  private gc(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
  }
}

class RedisStore implements RateLimitStore {
  private client: Redis;
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 3000, enableOfflineQueue: true });
    this.client.on("error", () => {}); // fail closed in rateLimit; never log connection credentials
  }
  async hit(key: string, windowMs: number) {
    const hashed = createHash("sha256").update(key).digest("hex");
    const result = await this.client.eval(`
      local n = redis.call('INCR', KEYS[1])
      if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
      return {n, redis.call('PTTL', KEYS[1])}
    `, 1, `cang:limit:${hashed}`, windowMs) as [number, number];
    return { count: Number(result[0]), resetAt: Date.now() + Number(result[1]) };
  }
}

declare global {

  var __cangRateLimitStore: RateLimitStore | undefined;
}

const store: RateLimitStore = globalThis.__cangRateLimitStore ?? (process.env.REDIS_URL ? new RedisStore(process.env.REDIS_URL) : new MemoryStore());
globalThis.__cangRateLimitStore = store;

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

export async function rateLimit(key: string, opts: { limit: number; windowMs: number }): Promise<RateLimitResult> {
  try {
    const { count, resetAt } = await store.hit(key, opts.windowMs);
    return { allowed: count <= opts.limit, remaining: Math.max(0, opts.limit - count), resetAt };
  } catch {
    console.error("[rate-limit] store unavailable; protected action denied");
    return { allowed: false, remaining: 0, resetAt: Date.now() + opts.windowMs };
  }
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
