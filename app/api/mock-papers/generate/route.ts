import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { verifyToken } from "@/lib/auth"

function generateSampleQuestions() {
  return [
    { text: "Explain the main concept from the document.", marks: 5 },
    { text: "Describe the key points covered.", marks: 7 },
    { text: "What are the important terms and definitions?", marks: 5 },
    { text: "Provide examples from the material.", marks: 8 },
    { text: "Summarize the document in your own words.", marks: 5 },
  ]
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
    const { documentId, title } = await request.json()

    const document = await Document.findOne({
      _id: documentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const questions = generateSampleQuestions()

    const mockPaper = new MockPaper({
      userId: payload.userId,
      documentId,
      title: title || "Mock Paper",
      questions,
    })

    await mockPaper.save()

    return NextResponse.json(
      {
        mockPaper: {
          id: mockPaper._id,
          title: mockPaper.title,
          questions: mockPaper.questions,
          totalMarks: mockPaper.questions.reduce((sum: number, q) => sum + (q.marks || 0), 0),
          createdAt: mockPaper.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate mock paper error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
