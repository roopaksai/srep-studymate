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

    // Keep only the 5 most recent schedules, delete older ones
    if (schedules.length > 5) {
      const schedulesToDelete = schedules.slice(5).map((s) => s._id)
      await Schedule.deleteMany({ _id: { $in: schedulesToDelete } })
      console.log(`Deleted ${schedulesToDelete.length} old schedules for user ${payload.userId}`)
    }

    // Transform _id to id for frontend compatibility (only return top 5)
    const transformedSchedules = schedules.slice(0, 5).map((schedule) => ({
      ...schedule.toObject(),
      id: schedule._id.toString(),
    }))

    return NextResponse.json({ schedules: transformedSchedules })
  } catch (error) {
    console.error("Get schedules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
