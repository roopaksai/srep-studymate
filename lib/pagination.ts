/**
 * Pagination Utility
 * 
 * Provides consistent pagination across all API endpoints
 * 
 * Usage:
 * import { getPaginationParams, paginateResults } from '@/lib/pagination'
 * 
 * const { page, limit, skip } = getPaginationParams(request)
 * const items = await Model.find().skip(skip).limit(limit)
 * const total = await Model.countDocuments()
 * return paginateResults(items, { page, limit, total })
 */

import { NextRequest } from 'next/server'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

/**
 * Extract pagination parameters from request
 * @param request - NextRequest object
 * @param defaultLimit - Default items per page (default: 20)
 * @param maxLimit - Maximum items per page (default: 100)
 * @returns Pagination parameters
 */
export function getPaginationParams(
  request: NextRequest,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const searchParams = request.nextUrl.searchParams
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10))
  )
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Create paginated response object
 * @param data - Array of items
 * @param params - Pagination parameters with total count
 * @returns Paginated response object
 */
export function paginateResults<T>(
  data: T[],
  params: { page: number; limit: number; total: number }
): PaginatedResponse<T> {
  const { page, limit, total } = params
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

/**
 * Build pagination metadata without data
 * @param params - Pagination parameters with total count
 * @returns Pagination metadata
 */
export function buildPaginationMeta(params: {
  page: number
  limit: number
  total: number
}): PaginationMeta {
  const { page, limit, total } = params
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Cursor-based pagination helper (for future use)
 * More efficient for large datasets
 */
export interface CursorPaginationParams {
  cursor?: string
  limit: number
}

export interface CursorPaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
}

/**
 * Get cursor pagination parameters
 * @param request - NextRequest object
 * @param defaultLimit - Default items per page
 * @returns Cursor pagination parameters
 */
export function getCursorPaginationParams(
  request: NextRequest,
  defaultLimit: number = 20
): CursorPaginationParams {
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get('cursor') || undefined
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10)))

  return { cursor, limit }
}
