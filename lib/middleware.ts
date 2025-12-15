/**
 * Reusable middleware functions for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { checkRateLimit, rateLimitConfigs } from './rateLimit'
import { logger } from './logger'

/**
 * Get client identifier for rate limiting (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0] || realIp || cfConnecting || 'unknown'
}

/**
 * Authentication middleware
 */
export async function requireAuth(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    logger.warn('Authentication failed: No token provided')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await verifyToken(token)
  
  if (!payload || !payload.userId) {
    logger.warn('Authentication failed: Invalid token')
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  logger.debug('Authentication successful', { userId: payload.userId })
  return { userId: payload.userId as string }
}

/**
 * Rate limiting middleware
 */
export function requireRateLimit(
  request: NextRequest,
  config: { limit: number; windowMs: number } = rateLimitConfigs.general
): NextResponse | null {
  const identifier = getClientIdentifier(request)
  
  if (!checkRateLimit(identifier, config.limit, config.windowMs)) {
    logger.warn('Rate limit exceeded', { 
      identifier, 
      limit: config.limit, 
      windowMs: config.windowMs 
    })
    
    return NextResponse.json(
      { 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(config.windowMs / 1000)),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
        }
      }
    )
  }
  
  return null
}

/**
 * Request logging middleware
 */
export function logRequest(request: NextRequest): void {
  const method = request.method
  const path = new URL(request.url).pathname
  const identifier = getClientIdentifier(request)
  
  logger.info('Incoming request', { method, path, identifier })
}

/**
 * Error handling wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T | NextResponse> {
  try {
    return await fn()
  } catch (error) {
    logger.error(errorMessage, error)
    
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : 'Unknown error'
      : 'Internal server error'
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * Combined middleware composer
 */
export function withMiddleware<T extends { userId: string }>(
  handler: (request: NextRequest, context: T) => Promise<Response>,
  options: {
    auth?: boolean
    rateLimit?: { limit: number; windowMs: number }
    log?: boolean
  } = {}
) {
  return async (request: NextRequest) => {
    // Logging
    if (options.log !== false) {
      logRequest(request)
    }
    
    // Rate limiting
    if (options.rateLimit) {
      const rateLimitResponse = requireRateLimit(request, options.rateLimit)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }
    
    // Authentication
    let context: any = { userId: '' }
    if (options.auth) {
      const authResult = await requireAuth(request)
      if (authResult instanceof NextResponse) {
        return authResult
      }
      context = authResult
    }
    
    // Execute handler with error handling
    const result = await withErrorHandling(
      () => handler(request, context as T),
      'Request handler failed'
    )
    
    return result instanceof NextResponse ? result : result as Response
  }
}
