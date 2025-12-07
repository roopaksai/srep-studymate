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
    const reports = await AnalysisReport.find({ userId: payload.userId }).sort({ createdAt: -1 })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Get analysis reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
