/**
 * Centralized logging system
 * Provides structured logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Format log message with timestamp and metadata
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

/**
 * Logger instance with different log levels
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.debug(formatLog('debug', message, context))
    }
  },

  /**
   * Info logs - general information
   */
  info: (message: string, context?: LogContext) => {
    console.log(formatLog('info', message, context))
  },

  /**
   * Warning logs - potential issues
   */
  warn: (message: string, context?: LogContext) => {
    console.warn(formatLog('warn', message, context))
  },

  /**
   * Error logs - actual errors
   */
  error: (message: string, error?: any, context?: LogContext) => {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...context }
      : { error, ...context }
    
    console.error(formatLog('error', message, errorDetails))
    
    // In production, you could send to external service like Sentry
    if (isProduction) {
      // captureException(error, context)
    }
  },

  /**
   * API request logging
   */
  apiRequest: (method: string, path: string, statusCode?: number, duration?: number) => {
    const context: LogContext = { method, path }
    if (statusCode) context.statusCode = statusCode
    if (duration) context.durationMs = duration
    
    logger.info('API Request', context)
  },

  /**
   * Database operation logging
   */
  dbOperation: (operation: string, collection: string, duration?: number) => {
    const context: LogContext = { operation, collection }
    if (duration) context.durationMs = duration
    
    logger.debug('Database Operation', context)
  },

  /**
   * AI operation logging
   */
  aiOperation: (operation: string, model: string, duration?: number, tokens?: number) => {
    const context: LogContext = { operation, model }
    if (duration) context.durationMs = duration
    if (tokens) context.tokens = tokens
    
    logger.info('AI Operation', context)
  },
}

/**
 * Performance measurement wrapper
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logger.debug(`Performance: ${operation}`, { durationMs: duration })
    return result
  } catch (error) {
    const duration = Date.now() - start
    logger.error(`Performance: ${operation} failed`, error, { durationMs: duration })
    throw error
  }
}

/**
 * Function execution timer decorator
 */
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value
  
  descriptor.value = async function (...args: any[]) {
    const start = Date.now()
    try {
      const result = await originalMethod.apply(this, args)
      const duration = Date.now() - start
      logger.debug(`${propertyKey} executed`, { durationMs: duration })
      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error(`${propertyKey} failed`, error, { durationMs: duration })
      throw error
    }
  }
  
  return descriptor
}
