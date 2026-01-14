import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/auth"
import bcryptjs from "bcryptjs"
import { logger } from "@/lib/logger"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateRequest, userSignupSchema, sanitizeMongoQuery } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with very strict rate limiting
    const security = await secureRoute(request, {
      requireAuth: false,
      rateLimit: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)

    await connectDB()
    const body = await request.json()
    
    // Validate input with strong password requirements
    const validation = await validateRequest(userSignupSchema, body)
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      ))
    }
    
    const { name, email, password } = sanitizeMongoQuery(validation.data)

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const passwordHash = bcryptjs.hashSync(password, 10)
    const user = new User({ email, passwordHash, name })
    await user.save()

    const token = generateToken(user._id.toString())

    return NextResponse.json(
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error('Signup error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
