import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import MockPaper from "@/lib/models/MockPaper"
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
    const mockPapers = await MockPaper.find({ userId: payload.userId }).sort({ createdAt: -1 })

    const papersWithMarks = mockPapers.map((paper) => ({
      ...paper.toObject(),
      totalMarks: paper.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0),
    }))

    return NextResponse.json({ mockPapers: papersWithMarks })
  } catch (error) {
    console.error("Get mock papers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
