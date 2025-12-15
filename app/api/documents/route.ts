import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { getPaginationParams, paginateResults } from "@/lib/pagination"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
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
        .select('originalFileName type topics createdAt')
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
    logger.error('Get documents error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
