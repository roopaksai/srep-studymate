import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import MockPaper from "@/lib/models/MockPaper"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { handleError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { getPaginationParams, paginateResults } from "@/lib/pagination"
import { rateLimitConfigs } from "@/lib/rateLimit"

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await secureRoute(request, { requireAuth: true, rateLimit: rateLimitConfigs.read })
    if (error) return error

    await connectDB()
    
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(request)
    
    // Fetch mock papers with pagination
    const [mockPapers, total] = await Promise.all([
      MockPaper.find({ userId })
        .select('title documentId paperType questions createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MockPaper.countDocuments({ userId })
    ])

    // Transform _id to id and add totalMarks for frontend compatibility
    const papersWithMarks = mockPapers.map((paper) => ({
      ...paper,
      id: paper._id.toString(),
      totalMarks: paper.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0),
    }))

    return addSecurityHeaders(NextResponse.json(paginateResults(papersWithMarks, { page, limit, total })))
  } catch (error) {
    logger.error('Get mock papers error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}
