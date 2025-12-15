import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"

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
    const documents = await Document.find({ userId: payload.userId }).sort({ createdAt: -1 })

    // Transform _id to id for frontend compatibility
    const transformedDocuments = documents.map((doc) => ({
      ...doc.toObject(),
      id: doc._id.toString(),
    }))

    return NextResponse.json({ documents: transformedDocuments })
  } catch (error) {
    logger.error('Get documents error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
