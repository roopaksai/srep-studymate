/**
 * Rate limiting utility to prevent API abuse
 * In-memory storage for development, can be replaced with Redis for production
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory storage (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, RateLimitRecord>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // No record or expired - allow request
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return false
  }

  // Increment count and allow
  record.count++
  return true
}

/**
 * Get remaining requests for an identifier
 */
export function getRemainingRequests(identifier: string, limit: number = 100): number {
  const record = rateLimitMap.get(identifier)
  if (!record || Date.now() > record.resetTime) {
    return limit
  }
  return Math.max(0, limit - record.count)
}

/**
 * Reset rate limit for an identifier (useful for testing or admin override)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier)
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  
  // Document upload - moderate limits
  upload: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 uploads per hour
  
  // AI generation - moderate limits to prevent abuse
  aiGeneration: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 generations per hour
  
  // General API - generous limits
  general: { limit: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  
  // Read operations - very generous
  read: { limit: 200, windowMs: 15 * 60 * 1000 }, // 200 requests per 15 minutes
}
