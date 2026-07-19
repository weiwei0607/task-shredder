/**
 * Simple in-memory rate limiter for Next.js API routes.
 * NOTE: In-memory maps are reset on serverless cold starts.
 * For production-scale apps, use Redis.
 */

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const map = new Map<string, number[]>();

  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = map.get(ip) ?? [];
    const valid = timestamps.filter((t) => now - t < options.windowMs);
    map.set(ip, valid);

    if (valid.length >= options.maxRequests) {
      return true;
    }

    valid.push(now);
    return false;
  };
}

export function getClientIP(req: Request): string {
  // Prefer Vercel-specific headers; fallback to standard forwarded headers.
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
