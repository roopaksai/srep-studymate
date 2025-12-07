import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { verifyToken } from "@/lib/auth"

async function generateQuestionsWithAI(text: string): Promise<{ text: string; marks: number }[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          {
            role: "system",
            content: "You are an expert exam question creator. Generate 6-8 exam questions from the study material. Return ONLY a JSON array with objects containing 'text' (the question) and 'marks' (integer between 3-10) fields. Create a mix of short-answer, long-answer, and application questions.",
          },
          {
            role: "user",
            content: `Create exam questions from this material:\n\n${text.substring(0, 3000)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0])
      return questions.filter((q: any) => q.text && typeof q.marks === 'number')
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI generation failed, using fallback:", error)
    // Fallback questions
    return [
      { text: "Explain the main concepts covered in the study material.", marks: 10 },
      { text: "Describe the key points and their significance.", marks: 8 },
      { text: "Define the important terms mentioned in the text.", marks: 5 },
      { text: "Provide practical examples demonstrating the concepts.", marks: 7 },
      { text: "Analyze the relationships between different topics.", marks: 10 },
    ]
  }
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

    const questions = await generateQuestionsWithAI(document.extractedText)

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
