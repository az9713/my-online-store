import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers to apply to all responses.
 * Applied via Next.js middleware or next.config.ts headers.
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Basic rate limiter using in-memory map.
 * For production, use Redis or a dedicated rate limiting service.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: NextRequest,
  options: { maxRequests: number; windowMs: number } = {
    maxRequests: 60,
    windowMs: 60000,
  }
): { allowed: boolean; remaining: number } {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, options.maxRequests - entry.count);
  return { allowed: entry.count <= options.maxRequests, remaining };
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
    { status: 429 }
  );
}
