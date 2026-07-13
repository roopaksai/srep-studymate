import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import FlashcardSet from "@/lib/models/FlashcardSet"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
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
    
    // Fetch documents with pagination and lean queries for performance
    const [documents, total] = await Promise.all([
      Document.find({ userId })
        .select('originalFileName title fileHash sourceType type topics processingStatus processingError jobId metadata createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments({ userId })
    ])

    // Transform _id to id for frontend compatibility
    const transformedDocuments = documents.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    }))

    return addSecurityHeaders(NextResponse.json(paginateResults(transformedDocuments, { page, limit, total })))
  } catch (error) {
    logger.error('Get documents error', { error: error instanceof Error ? error.message : String(error) })
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, error } = await secureRoute(request, { requireAuth: true, rateLimit: rateLimitConfigs.read })
    if (error) return error

    const { documentId } = await request.json()
    if (!documentId) {
      return addSecurityHeaders(NextResponse.json({ error: "documentId is required" }, { status: 400 }))
    }

    await connectDB()

    const document = await Document.findOne({ _id: documentId, userId })
    if (!document) {
      return addSecurityHeaders(NextResponse.json({ error: "Document not found" }, { status: 404 }))
    }

    // Hard-delete the document and all associated data
    await Promise.all([
      Document.deleteOne({ _id: documentId }),
      FlashcardSet.deleteMany({ documentId }),
      MockPaper.deleteMany({ documentId }),
      AnalysisReport.deleteMany({ answerScriptDocumentId: documentId }),
    ])

    logger.info('Document deleted', { documentId, userId })
    return addSecurityHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    logger.error('Delete document error', { error: error instanceof Error ? error.message : String(error) })
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}
