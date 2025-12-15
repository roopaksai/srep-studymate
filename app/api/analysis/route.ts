import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { verifyToken } from "@/lib/auth"

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
    const allReports = await AnalysisReport.find({ userId: payload.userId }).sort({ createdAt: -1 })

    // Keep only the 5 most recent reports, delete the rest
    if (allReports.length > 5) {
      const reportsToDelete = allReports.slice(5) // Get reports after the first 5
      const idsToDelete = reportsToDelete.map(r => r._id)
      await AnalysisReport.deleteMany({ _id: { $in: idsToDelete } })
    }

    // Get the kept reports (top 5)
    const reports = allReports.slice(0, 5)

    // Transform _id to id for frontend compatibility
    const transformedReports = reports.map((report) => ({
      ...report.toObject(),
      id: report._id.toString(),
    }))

    return NextResponse.json({ reports: transformedReports })
  } catch (error) {
    console.error("Get analysis reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
