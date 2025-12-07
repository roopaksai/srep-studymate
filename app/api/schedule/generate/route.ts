import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Schedule from "@/lib/models/Schedule"
import { verifyToken } from "@/lib/auth"

function generateScheduleSlots(startDate: Date, endDate: Date, topics: string[]) {
  const slots = []
  const currentDate = new Date(startDate)
  let topicIndex = 0

  while (currentDate < new Date(endDate)) {
    if (topicIndex < topics.length) {
      slots.push({
        date: new Date(currentDate),
        topic: topics[topicIndex],
        durationMinutes: 60,
      })
      topicIndex = (topicIndex + 1) % topics.length
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return slots
}

export async function POST(request: NextRequest) {
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
    const { startDate, endDate, topics } = await request.json()

    if (!startDate || !endDate || !topics || topics.length === 0) {
      return NextResponse.json({ error: "startDate, endDate, and topics are required" }, { status: 400 })
    }

    const slots = generateScheduleSlots(new Date(startDate), new Date(endDate), topics)

    const schedule = new Schedule({
      userId: payload.userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      slots,
    })

    await schedule.save()

    return NextResponse.json(
      {
        schedule: {
          id: schedule._id,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          slots: schedule.slots,
          createdAt: schedule.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate schedule error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
