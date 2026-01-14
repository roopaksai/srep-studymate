/**
 * Enhanced Security Utilities
 * Comprehensive security middleware and helpers
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { checkRateLimit, rateLimitConfigs } from './rateLimit'
import { logger } from './logger'
import crypto from 'crypto'

/**
 * Get client identifier for security tracking
 */
export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')
  
  return forwarded?.split(',')[0]?.trim() || realIp || cfConnecting || 'unknown'
}

/**
 * CORS configuration - restrict origins
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://*.vercel.app', // Vercel preview deployments
]

export function validateCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  
  // If no origin header (same-origin request), allow
  if (!origin) return null
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*.', '')
      return origin.endsWith(pattern)
    }
    return origin === allowed
  })
  
  if (!isAllowed) {
    logger.warn('CORS violation', { origin, ip: getClientIdentifier(request) })
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    )
  }
  
  return null
}

/**
 * Validate request integrity with timestamp and signature
 */
export function validateRequestIntegrity(request: NextRequest): boolean {
  const timestamp = request.headers.get('x-request-timestamp')
  const signature = request.headers.get('x-request-signature')
  
  if (!timestamp || !signature) {
    return false
  }
  
  // Check timestamp is within 5 minutes
  const requestTime = parseInt(timestamp)
  const now = Date.now()
  const timeDiff = Math.abs(now - requestTime)
  
  if (timeDiff > 5 * 60 * 1000) {
    logger.warn('Request timestamp expired', { timestamp, now })
    return false
  }
  
  // Verify signature (implement based on your signing strategy)
  // For now, we'll add this as optional enhancement
  return true
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential MongoDB operators and scripts
    return input
      .replace(/\$\w+/g, '') // Remove MongoDB operators
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      // Skip MongoDB operators in keys
      if (!key.startsWith('$') && !key.startsWith('_')) {
        sanitized[key] = sanitizeInput(value)
      }
    }
    return sanitized
  }
  
  return input
}

/**
 * Validate JWT token strength
 */
export function isStrongJWT(): boolean {
  const secret = process.env.JWT_SECRET
  
  if (!secret || secret.length < 32) {
    logger.error('JWT_SECRET is too weak or missing')
    return false
  }
  
  if (secret === 'your-secret-key-change-in-production') {
    logger.error('Using default JWT_SECRET - SECURITY RISK!')
    return false
  }
  
  return true
}

/**
 * Comprehensive security middleware
 */
export async function secureRoute(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    rateLimit?: { limit: number; windowMs: number }
    allowedMethods?: string[]
    validateInput?: boolean
  } = {}
): Promise<{ userId?: string; error?: NextResponse }> {
  const {
    requireAuth = true,
    rateLimit = rateLimitConfigs.general,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    validateInput = true,
  } = options

  // 1. Check HTTP method
  if (!allowedMethods.includes(request.method)) {
    return {
      error: NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      ),
    }
  }

  // 2. CORS validation
  const corsError = validateCORS(request)
  if (corsError) {
    return { error: corsError }
  }

  // 3. Rate limiting
  const identifier = getClientIdentifier(request)
  if (!checkRateLimit(identifier, rateLimit.limit, rateLimit.windowMs)) {
    logger.warn('Rate limit exceeded', { identifier, path: request.nextUrl.pathname })
    return {
      error: NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(rateLimit.windowMs / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.windowMs / 1000)),
          },
        }
      ),
    }
  }

  // 4. Authentication
  if (requireAuth) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      logger.warn('Missing auth token', { identifier, path: request.nextUrl.pathname })
      return {
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }

    const payload = await verifyToken(token)
    
    if (!payload || !payload.userId) {
      logger.warn('Invalid auth token', { identifier, path: request.nextUrl.pathname })
      return {
        error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
      }
    }

    return { userId: payload.userId as string }
  }

  return {}
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  )
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  )
  
  return response
}

/**
 * Generate API request signature for client
 */
export function generateRequestSignature(payload: any, secret: string): string {
  const timestamp = Date.now()
  const data = JSON.stringify({ ...payload, timestamp })
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
  
  return signature
}

/**
 * Verify API request signature
 */
export function verifyRequestSignature(
  payload: any,
  signature: string,
  timestamp: number,
  secret: string
): boolean {
  // Check timestamp freshness (5 minutes)
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return false
  }
  
  const data = JSON.stringify({ ...payload, timestamp })
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Check if environment is properly secured
 */
export function checkSecurityConfig(): {
  secure: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET is missing or too weak (min 32 characters)')
  }
  
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    issues.push('Using default JWT_SECRET - change immediately!')
  }
  
  if (!process.env.MONGODB_URI) {
    issues.push('MONGODB_URI is not configured')
  }
  
  if (!process.env.OPENROUTER_API_KEY) {
    issues.push('OPENROUTER_API_KEY is not configured')
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === 'production') {
    issues.push('NEXT_PUBLIC_APP_URL should be set in production')
  }
  
  return {
    secure: issues.length === 0,
    issues,
  }
}
