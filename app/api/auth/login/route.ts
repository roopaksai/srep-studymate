import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/auth"
import bcryptjs from "bcryptjs"
import { logger } from "@/lib/logger"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateRequest, userLoginSchema, sanitizeMongoQuery } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with strict rate limiting
    const security = await secureRoute(request, {
      requireAuth: false,
      rateLimit: rateLimitConfigs.auth,
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)

    await connectDB()
    const body = await request.json()
    
    // Validate input
    const validation = await validateRequest(userLoginSchema, body)
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      ))
    }
    
    const { email, password } = sanitizeMongoQuery(validation.data)

    const user = await User.findOne({ email })
    if (!user) {
      logger.warn('Login failed - user not found', { email })
      return addSecurityHeaders(NextResponse.json({ error: "Invalid email or password" }, { status: 401 }))
    }

    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      logger.warn('Login failed - invalid password', { email })
      return addSecurityHeaders(NextResponse.json({ error: "Invalid email or password" }, { status: 401 }))
    }

    const token = generateToken(user._id.toString())

    logger.info('Login successful', { userId: user._id })

    return addSecurityHeaders(NextResponse.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    }))
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return addSecurityHeaders(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}
