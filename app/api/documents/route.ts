import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import FlashcardSet from "@/lib/models/FlashcardSet"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { getPaginationParams, paginateResults } from "@/lib/pagination"

function getToken(request: NextRequest): string | null {
  return request.headers.get("authorization")?.replace("Bearer ", "") || null
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()
    
    // Get pagination parameters
    const { page, limit, skip } = getPaginationParams(request)
    
    // Fetch documents with pagination and lean queries for performance
    const [documents, total] = await Promise.all([
      Document.find({ userId: payload.userId })
        .select('originalFileName title fileHash sourceType type topics processingStatus processingError jobId metadata createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments({ userId: payload.userId })
    ])

    // Transform _id to id for frontend compatibility
    const transformedDocuments = documents.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    }))

    return NextResponse.json(paginateResults(transformedDocuments, { page, limit, total }))
  } catch (error) {
    logger.error('Get documents error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { documentId } = await request.json()
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    await connectDB()

    const document = await Document.findOne({ _id: documentId, userId: payload.userId })
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Hard-delete the document and all associated data
    await Promise.all([
      Document.deleteOne({ _id: documentId }),
      FlashcardSet.deleteMany({ documentId }),
      MockPaper.deleteMany({ documentId }),
      AnalysisReport.deleteMany({ answerScriptDocumentId: documentId }),
    ])

    logger.info('Document deleted', { documentId, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Delete document error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
