import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import FlashcardSet from "@/lib/models/FlashcardSet"
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
    
    // Fetch flashcard sets with pagination
    const [flashcardSets, total] = await Promise.all([
      FlashcardSet.find({ userId })
        .select('title documentId cards createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FlashcardSet.countDocuments({ userId })
    ])

    // Transform _id to id and add documentId for frontend compatibility
    const transformedFlashcardSets = flashcardSets.map((set) => ({
      ...set,
      id: set._id.toString(),
      documentId: set.documentId.toString(),
    }))

    return addSecurityHeaders(NextResponse.json(paginateResults(transformedFlashcardSets, { page, limit, total })))
  } catch (error) {
    logger.error('Get flashcards error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}

export async function GET_SINGLE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, error } = await secureRoute(request, { requireAuth: true, rateLimit: rateLimitConfigs.read })
    if (error) return error

    await connectDB()
    const flashcardSet = await FlashcardSet.findOne({
      _id: params.id,
      userId,
    })

    if (!flashcardSet) {
      return addSecurityHeaders(NextResponse.json({ error: "Flashcard set not found" }, { status: 404 }))
    }

    return addSecurityHeaders(NextResponse.json({ flashcardSet }))
  } catch (error) {
    console.error("Get flashcard set error:", error)
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}
