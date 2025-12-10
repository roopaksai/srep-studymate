import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/auth"
import bcryptjs from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { email, password, name } = await request.json()

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
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
