import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import FlashcardSet from "@/lib/models/FlashcardSet"
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
    const flashcardSets = await FlashcardSet.find({ userId: payload.userId }).sort({ createdAt: -1 })

    return NextResponse.json({ flashcardSets })
  } catch (error) {
    console.error("Get flashcards error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET_SINGLE(request: NextRequest, { params }: { params: { id: string } }) {
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
    const flashcardSet = await FlashcardSet.findOne({
      _id: params.id,
      userId: payload.userId,
    })

    if (!flashcardSet) {
      return NextResponse.json({ error: "Flashcard set not found" }, { status: 404 })
    }

    return NextResponse.json({ flashcardSet })
  } catch (error) {
    console.error("Get flashcard set error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
