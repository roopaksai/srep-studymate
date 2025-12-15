import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Schedule from "@/lib/models/Schedule"
import { verifyToken } from "@/lib/auth"

interface TopicWithPriority {
  topic: string
  priority: "high" | "medium" | "low"
  allocatedMinutes?: number
}

async function generateScheduleWithAI(
  topics: TopicWithPriority[],
  startDate: Date,
  endDate: Date,
  studyHoursPerDay: number,
  restDays: number[]
): Promise<any[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const topicList = topics.map((t) => `${t.topic} (Priority: ${t.priority})`).join(", ")

    const systemPrompt = `You are an expert study planner. Create an optimal study schedule that:
1. Prioritizes HIGH priority topics first (allocate more time and earlier slots)
2. Distributes topics evenly across available days
3. Considers ${studyHoursPerDay} hours of study per day
4. Follows spaced repetition (revisit topics periodically)
5. Balances difficulty by mixing high and low priority topics

Return ONLY a JSON array of study sessions with this format:
[
  {
    "dayNumber": 1,
    "topic": "Topic Name",
    "durationMinutes": 90,
    "priority": "high"
  }
]

Important:
- dayNumber starts at 1 and goes up to ${totalDays}
- Total study time per day should not exceed ${studyHoursPerDay * 60} minutes
- High priority topics should appear more frequently and get longer durations
- Include revision sessions for important topics`

    const userPrompt = `Create a ${totalDays}-day study schedule for these topics:
${topicList}

Study hours per day: ${studyHoursPerDay}
Rest days: ${restDays.length > 0 ? restDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ") : "None"}`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "SREP StudyMate",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const sessions = JSON.parse(jsonMatch[0])
      return sessions.filter((s: any) => s.dayNumber && s.topic && s.durationMinutes)
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI schedule generation failed, using fallback:", error)
    return null
  }
}

function generateScheduleSlots(
  startDate: Date,
  endDate: Date,
  topics: TopicWithPriority[],
  studyHoursPerDay: number,
  restDays: number[],
  aiSessions?: any[]
) {
  const slots = []
  const currentDate = new Date(startDate)
  let dayNumber = 1

  // Priority-based time allocation
  const priorityMinutes = {
    high: 90,
    medium: 60,
    low: 45,
  }

  // If AI generated sessions, use them
  if (aiSessions && aiSessions.length > 0) {
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      
      // Skip rest days
      if (!restDays.includes(dayOfWeek)) {
        const daySessions = aiSessions.filter((s) => s.dayNumber === dayNumber)
        
        for (const session of daySessions) {
          slots.push({
            date: new Date(currentDate),
            topic: session.topic,
            durationMinutes: session.durationMinutes || 60,
            priority: session.priority || "medium",
            completed: false,
          })
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
      dayNumber++
    }
  } else {
    // Fallback: Smart distribution without AI
    // Sort topics by priority (high first)
    const sortedTopics = [...topics].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    let topicIndex = 0
    const dailyMinutesLimit = studyHoursPerDay * 60

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      
      // Skip rest days
      if (!restDays.includes(dayOfWeek)) {
        let dailyMinutes = 0
        const dailySlots = []

        // Fill the day with topics
        while (dailyMinutes < dailyMinutesLimit && topicIndex < sortedTopics.length * 3) {
          const topic = sortedTopics[topicIndex % sortedTopics.length]
          const duration = priorityMinutes[topic.priority]

          if (dailyMinutes + duration <= dailyMinutesLimit) {
            dailySlots.push({
              date: new Date(currentDate),
              topic: topic.topic,
              durationMinutes: duration,
              priority: topic.priority,
              completed: false,
            })
            dailyMinutes += duration
          }

          topicIndex++
        }

        slots.push(...dailySlots)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }
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
    const {
      startDate,
      endDate,
      topics,
      title = "Study Schedule",
      studyHoursPerDay = 3,
      restDays = [],
      useAI = true,
    } = await request.json()

    if (!startDate || !endDate || !topics || topics.length === 0) {
      return NextResponse.json({ error: "startDate, endDate, and topics are required" }, { status: 400 })
    }

    // Convert simple string array to TopicWithPriority array if needed
    const topicsWithPriority: TopicWithPriority[] = topics.map((t: any) => {
      if (typeof t === "string") {
        return { topic: t, priority: "medium" as const }
      }
      return t
    })

    // Try AI generation first if enabled
    let aiSessions = null
    if (useAI) {
      aiSessions = await generateScheduleWithAI(
        topicsWithPriority,
        new Date(startDate),
        new Date(endDate),
        studyHoursPerDay,
        restDays
      )
    }

    const slots = generateScheduleSlots(
      new Date(startDate),
      new Date(endDate),
      topicsWithPriority,
      studyHoursPerDay,
      restDays,
      aiSessions
    )

    const schedule = new Schedule({
      userId: payload.userId,
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      studyHoursPerDay,
      restDays,
      slots,
    })

    await schedule.save()

    return NextResponse.json(
      {
        schedule: {
          id: schedule._id,
          title: schedule.title,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          studyHoursPerDay: schedule.studyHoursPerDay,
          restDays: schedule.restDays,
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
