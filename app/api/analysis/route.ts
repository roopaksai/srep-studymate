import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import AnalysisReport from "@/lib/models/AnalysisReport"
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
    
    // Get pagination parameters (keeping backward compatibility with 5-limit logic)
    const { page, limit, skip } = getPaginationParams(request, 20)
    
    // First, handle the auto-delete logic for old reports
    const allReports = await AnalysisReport.find({ userId: payload.userId })
      .select('_id')
      .sort({ createdAt: -1 })
      .lean()
    
    if (allReports.length > 5) {
      const reportsToDelete = allReports.slice(5)
      const idsToDelete = reportsToDelete.map(r => r._id)
      await AnalysisReport.deleteMany({ _id: { $in: idsToDelete } })
    }
    
    // Now fetch paginated reports with projections
    const [reports, total] = await Promise.all([
      AnalysisReport.find({ userId: payload.userId })
        .select('title summary totalScore maxScore grade strengths weaknesses recommendedTopics createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnalysisReport.countDocuments({ userId: payload.userId })
    ])

    // Transform _id to id for frontend compatibility
    const transformedReports = reports.map((report) => ({
      ...report,
      id: report._id.toString(),
    }))

    return NextResponse.json(paginateResults(transformedReports, { page, limit, total }))
  } catch (error) {
    logger.error('Get analysis reports error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
