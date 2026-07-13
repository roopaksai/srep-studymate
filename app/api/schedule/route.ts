import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Schedule from "@/lib/models/Schedule"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { handleError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { rateLimitConfigs } from "@/lib/rateLimit"

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await secureRoute(request, { requireAuth: true, rateLimit: rateLimitConfigs.read })
    if (error) return error

    await connectDB()
    const schedules = await Schedule.find({ userId }).sort({ createdAt: -1 })

    // Keep only the 5 most recent schedules, delete older ones
    if (schedules.length > 5) {
      const schedulesToDelete = schedules.slice(5).map((s) => s._id)
      await Schedule.deleteMany({ _id: { $in: schedulesToDelete } })
      logger.info('Deleted old schedules', { count: schedulesToDelete.length, userId })
    }

    // Transform _id to id for frontend compatibility (only return top 5)
    const transformedSchedules = schedules.slice(0, 5).map((schedule) => ({
      ...schedule.toObject(),
      id: schedule._id.toString(),
    }))

    return addSecurityHeaders(NextResponse.json({ schedules: transformedSchedules }))
  } catch (error) {
    logger.error('Get schedules error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    const err = handleError(error)
    return addSecurityHeaders(NextResponse.json({ error: err.message }, { status: err.statusCode }))
  }
}
