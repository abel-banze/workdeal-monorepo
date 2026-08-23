/**
 * Rate limiting em memória (WS0) — suficiente para MVP single-replica.
 * Para multi-réplica trocar por Redis (ex: @hono/rate-limiter + upstash).
 */
export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
      const now = Date.now();
      const windowStart = now - opts.windowMs;
      const arr = (hits.get(key) ?? []).filter((t) => t > windowStart);
      arr.push(now);
      hits.set(key, arr);
      const allowed = arr.length <= opts.max;
      const resetAt = (arr[0] ?? now) + opts.windowMs;
      return { allowed, remaining: Math.max(0, opts.max - arr.length), resetAt };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
