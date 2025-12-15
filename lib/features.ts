/**
 * Feature Flags Configuration
 * 
 * Centralized feature toggle system for enabling/disabling features
 * without requiring code deployment.
 * 
 * Usage:
 * import { FEATURES } from '@/lib/features'
 * 
 * if (FEATURES.aiGeneration) {
 *   // Use AI generation
 * } else {
 *   // Use fallback
 * }
 */

export const FEATURES = {
  /**
   * AI-powered content generation
   * Set FEATURE_AI_GENERATION=false to disable AI and use fallbacks only
   */
  aiGeneration: process.env.FEATURE_AI_GENERATION !== 'false',

  /**
   * PDF export functionality
   * Set FEATURE_PDF_EXPORT=false to disable PDF generation
   */
  pdfExport: process.env.FEATURE_PDF_EXPORT !== 'false',

  /**
   * Background job processing for heavy operations
   * Set FEATURE_BACKGROUND_JOBS=true to enable async processing
   */
  backgroundJobs: process.env.FEATURE_BACKGROUND_JOBS === 'true',

  /**
   * Advanced analytics and reporting
   * Set FEATURE_ANALYTICS=true to enable detailed analytics
   */
  analytics: process.env.FEATURE_ANALYTICS === 'true',

  /**
   * Rate limiting on API endpoints
   * Set FEATURE_RATE_LIMIT=false to disable rate limiting
   */
  rateLimit: process.env.FEATURE_RATE_LIMIT !== 'false',

  /**
   * Caching layer for AI responses
   * Set FEATURE_CACHE=false to disable caching
   */
  cache: process.env.FEATURE_CACHE !== 'false',

  /**
   * Email notifications
   * Set FEATURE_NOTIFICATIONS=true to enable email notifications
   */
  notifications: process.env.FEATURE_NOTIFICATIONS === 'true',

  /**
   * Collaborative features (sharing, teams)
   * Set FEATURE_COLLABORATION=true to enable collaboration
   */
  collaboration: process.env.FEATURE_COLLABORATION === 'true',

  /**
   * Soft deletes (recoverable deletion)
   * Set FEATURE_SOFT_DELETE=true to enable soft deletes
   */
  softDelete: process.env.FEATURE_SOFT_DELETE === 'true',

  /**
   * Pagination on list endpoints
   * Set FEATURE_PAGINATION=false to disable pagination
   */
  pagination: process.env.FEATURE_PAGINATION !== 'false',
} as const

/**
 * Check if a feature is enabled
 * @param feature - Feature name to check
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature]
}

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature)
}

/**
 * Feature flag middleware for API routes
 * @param feature - Feature to check
 * @returns Middleware function
 */
export function requireFeature(feature: keyof typeof FEATURES) {
  return (handler: Function) => {
    return async (...args: any[]) => {
      if (!FEATURES[feature]) {
        return new Response(
          JSON.stringify({ error: `Feature '${feature}' is currently disabled` }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      return handler(...args)
    }
  }
}

// Type for feature flags
export type FeatureFlags = typeof FEATURES
export type FeatureName = keyof FeatureFlags
