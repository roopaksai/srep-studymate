import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import MockPaper from "@/lib/models/MockPaper"
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
    
    // Fetch mock papers with pagination
    const [mockPapers, total] = await Promise.all([
      MockPaper.find({ userId: payload.userId })
        .select('title documentId paperType questions createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MockPaper.countDocuments({ userId: payload.userId })
    ])

    // Transform _id to id and add totalMarks for frontend compatibility
    const papersWithMarks = mockPapers.map((paper) => ({
      ...paper,
      id: paper._id.toString(),
      totalMarks: paper.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0),
    }))

    return NextResponse.json(paginateResults(papersWithMarks, { page, limit, total }))
  } catch (error) {
    logger.error('Get mock papers error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
