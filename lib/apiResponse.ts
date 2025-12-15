/**
 * Standardized API response helpers
 */

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: any
  statusCode?: number
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  meta?: ApiSuccessResponse["meta"]
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  }
}

/**
 * Create an error API response
 */
export function apiError(
  error: string,
  details?: any,
  statusCode?: number
): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
    ...(statusCode && { statusCode }),
  }
}

/**
 * Create a paginated response
 */
export function apiPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) as number,
    },
  }
}
