import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Schedule from "@/lib/models/Schedule"
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
    const schedules = await Schedule.find({ userId: payload.userId }).sort({ createdAt: -1 })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Get schedules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
