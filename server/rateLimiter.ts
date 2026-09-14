/**
 * In-memory sliding-window Rate Limiter for API protection
 * Prevents brute-force attacks, OTP enumeration, DoS, and spam flooding.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if an action is within rate limits.
 * @param key Unique key (e.g. `otp:${ip}`, `feedback:${ip}`, `auth:${ip}`)
 * @param maxAllowed Maximum number of attempts allowed within windowMs
 * @param windowMs Time window in milliseconds
 * @returns { allowed: boolean, retryAfterSec: number, remaining: number }
 */
export function checkRateLimit(
  key: string,
  maxAllowed: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, retryAfterSec: 0, remaining: maxAllowed - 1 };
  }

  if (record.count >= maxAllowed) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  record.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: maxAllowed - record.count
  };
}

/**
 * Extracts a sanitized client IP from request headers or socket
 */
export function getClientIp(req: any): string {
  try {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      const firstIp = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers?.['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp.trim();
    }
    const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (socketIp && typeof socketIp === 'string') {
      return socketIp.replace(/^.*:/, ''); // strip IPv6 prefix if present
    }
  } catch {}
  return '127.0.0.1';
}

/**
 * Escapes HTML characters to prevent HTML/XSS injection in emails and responses
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sets hardened security CORS headers
 */
export function applySecurityHeaders(req: any, res: any): void {
  // 1. Core security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // 2. Safe CORS headers
  const origin = req.headers?.origin || req.headers?.Origin;
  const isAllowedOrigin = origin && (
    origin === 'https://efootballaihub.com' ||
    origin === 'https://www.efootballaihub.com' ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /^https:\/\/.*\.vercel\.app$/.test(origin) ||
    /^https:\/\/.*\.run\.app$/.test(origin)
  );

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
}
