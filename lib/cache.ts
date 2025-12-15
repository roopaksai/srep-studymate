/**
 * Simple in-memory caching layer
 * Reduces AI API calls and improves response time
 * For production, consider Redis or similar
 */

interface CacheEntry<T> {
  data: T
  expiry: number
}

// In-memory cache storage
const cache = new Map<string, CacheEntry<any>>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Get data from cache
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  
  if (!entry) {
    return null
  }
  
  // Check if expired
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  
  return entry.data as T
}

/**
 * Set data in cache with TTL
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  })
}

/**
 * Delete specific cache entry
 */
export function deleteCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  let activeEntries = 0
  let expiredEntries = 0
  
  for (const [, entry] of cache.entries()) {
    if (now > entry.expiry) {
      expiredEntries++
    } else {
      activeEntries++
    }
  }
  
  return {
    total: cache.size,
    active: activeEntries,
    expired: expiredEntries,
  }
}

/**
 * Generate cache key for AI requests
 */
export function generateAICacheKey(
  operation: string,
  content: string,
  params?: Record<string, any>
): string {
  // Create hash of content (first 1000 chars for performance)
  const contentHash = content.substring(0, 1000)
    .split('')
    .reduce((hash, char) => {
      const chr = char.charCodeAt(0)
      hash = ((hash << 5) - hash) + chr
      return hash & hash // Convert to 32-bit integer
    }, 0)
  
  const paramsStr = params ? JSON.stringify(params) : ''
  return `ai:${operation}:${contentHash}:${paramsStr}`
}

/**
 * Wrapper for cached function calls
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // Execute function and cache result
  const result = await fn()
  setCache(key, result, ttlMs)
  return result
}

/**
 * Cache TTL configurations for different data types
 */
export const cacheTTL = {
  // AI-generated content - 24 hours
  aiGeneration: 24 * 60 * 60 * 1000,
  
  // Document processing - 12 hours
  documentProcessing: 12 * 60 * 60 * 1000,
  
  // User data - 5 minutes
  userData: 5 * 60 * 1000,
  
  // Static content - 7 days
  staticContent: 7 * 24 * 60 * 60 * 1000,
}
