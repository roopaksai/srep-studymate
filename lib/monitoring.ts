/**
 * Error Tracking & Monitoring Setup
 * 
 * Integration guide for Sentry error tracking and monitoring.
 * 
 * Setup Instructions:
 * 
 * 1. Install Sentry SDK:
 *    pnpm add @sentry/nextjs
 * 
 * 2. Initialize Sentry:
 *    npx @sentry/wizard@latest -i nextjs
 * 
 * 3. Configure environment variables:
 *    Add to .env.local:
 *    NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
 *    SENTRY_AUTH_TOKEN=your_auth_token_here
 * 
 * 4. Files will be auto-generated:
 *    - sentry.client.config.ts
 *    - sentry.server.config.ts
 *    - sentry.edge.config.ts
 * 
 * 5. Custom error tracking in code:
 */

// Example usage in API routes:
import * as Sentry from '@sentry/nextjs'
import logger from './logger'

export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context,
    })
  }
  
  // Still log locally with structured logging
  logger.error('Error captured', {
    error: error.message,
    stack: error.stack,
    ...context,
  })
}

// Example usage with user context:
export function setUserContext(userId: string, email: string) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.setUser({
      id: userId,
      email,
    })
  }
}

// Example usage for performance monitoring:
export function trackPerformance(name: string, startTime: number) {
  const duration = Date.now() - startTime
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name} took ${duration}ms`,
      level: 'info',
    })
  }
  
  return duration
}

/**
 * Alternative: Self-hosted error tracking
 * 
 * If you prefer self-hosted solutions:
 * 
 * 1. GlitchTip (Sentry-compatible, open source):
 *    - Docker: docker run -p 8000:8000 glitchtip/glitchtip
 *    - Use same Sentry SDK with custom DSN
 * 
 * 2. LogTail (Log aggregation):
 *    - pnpm add @logtail/node
 *    - Use with existing logger.ts
 * 
 * 3. Better Stack (formerly Logtail):
 *    - Sign up: https://betterstack.com
 *    - Free tier: 1GB/month
 */

// Example LogTail integration:
/*
import { Logtail } from '@logtail/node'

const logtail = new Logtail(process.env.LOGTAIL_TOKEN!)

export const logger = {
  info: (message: string, context?: any) => {
    console.info(message, context)
    logtail.info(message, context)
  },
  error: (message: string, context?: any) => {
    console.error(message, context)
    logtail.error(message, context)
  },
  warn: (message: string, context?: any) => {
    console.warn(message, context)
    logtail.warn(message, context)
  },
}
*/

/**
 * Monitoring Checklist:
 * 
 * ✅ Error Tracking (Sentry/GlitchTip)
 * ✅ Log Aggregation (LogTail/Better Stack)
 * ✅ Uptime Monitoring (UptimeRobot/Vercel)
 * ✅ Performance Monitoring (Sentry Performance)
 * ✅ Database Monitoring (MongoDB Atlas Charts)
 * ✅ API Response Times (Vercel Analytics)
 * 
 * Key Metrics to Track:
 * - Error rate (target: <1%)
 * - API response time (target: <200ms for lists, <30s for AI)
 * - Database query time (target: <100ms)
 * - Uptime (target: 99.9%)
 * - User session duration
 * - Feature adoption rates
 */

export const MONITORING = {
  // Sentry configuration
  sentry: {
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  },
  
  // Performance thresholds
  thresholds: {
    apiResponseTime: 200, // ms
    aiGenerationTime: 30000, // ms
    databaseQueryTime: 100, // ms
    errorRate: 0.01, // 1%
  },
}
