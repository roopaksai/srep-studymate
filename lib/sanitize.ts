/**
 * Input sanitization utilities
 * Prevent XSS and other injection attacks
 */

/**
 * Remove HTML tags and scripts from text
 */
export function sanitizeHTML(text: string): string {
  if (!text) return ''
  
  return text
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove HTML entities
    .replace(/&[a-z]+;/gi, '')
    .trim()
}

/**
 * Sanitize text for display (preserve basic structure)
 */
export function sanitizeText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Sanitize filename (prevent path traversal)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed'
  
  return filename
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove potentially dangerous characters
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    // Remove leading dots (hidden files)
    .replace(/^\.+/, '')
    // Limit length
    .substring(0, 255)
    .trim() || 'unnamed'
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '')
}

/**
 * Sanitize MongoDB query to prevent NoSQL injection
 */
export function sanitizeMongoQuery(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/[\$\{\}]/g, '')
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeMongoQuery)
  }
  
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = {}
    for (const [key, val] of Object.entries(value)) {
      // Skip MongoDB operators
      if (key.startsWith('$')) {
        continue
      }
      sanitized[key] = sanitizeMongoQuery(val)
    }
    return sanitized
  }
  
  return value
}

/**
 * Validate and sanitize ObjectId
 */
export function sanitizeObjectId(id: string): string | null {
  if (!id) return null
  
  // MongoDB ObjectId is 24 hex characters
  const cleaned = id.trim()
  if (!/^[0-9a-fA-F]{24}$/.test(cleaned)) {
    return null
  }
  
  return cleaned
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text: string, maxLength: number = 1000): string {
  if (!text) return ''
  
  if (text.length <= maxLength) {
    return text
  }
  
  return text.substring(0, maxLength) + '...'
}

/**
 * Remove null bytes and control characters
 */
export function removeControlCharacters(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Comprehensive text sanitization for user input
 */
export function sanitizeUserInput(text: string): string {
  if (!text) return ''
  
  return removeControlCharacters(
    sanitizeText(text)
  )
}
