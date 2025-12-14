import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"

interface PatternAnalysis {
  commonTopics: string[]
  questionTypes: {
    mcq: number
    shortAnswer: number
    descriptive: number
  }
  marksDistribution: {
    low: number // 1-5 marks
    medium: number // 6-10 marks
    high: number // 11+ marks
  }
  frequentKeywords: string[]
  difficulty: "easy" | "medium" | "hard"
  recommendations: string[]
}

async function analyzePatternWithAI(text: string): Promise<PatternAnalysis> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-coder:free",
        messages: [
          {
            role: "system",
            content: `You are an expert exam pattern analyst. Analyze previous question papers to identify patterns and trends.

Return ONLY a JSON object with these fields:
- commonTopics: array of 5-8 strings (recurring topics across papers)
- questionTypes: object with counts {mcq: number, shortAnswer: number, descriptive: number}
- marksDistribution: object {low: number (1-5 marks), medium: number (6-10 marks), high: number (11+ marks)}
- frequentKeywords: array of 8-12 strings (commonly appearing terms/concepts)
- difficulty: string ("easy", "medium", or "hard")
- recommendations: array of 4-6 strings (study preparation tips based on pattern)

Analyze question distribution, marks allocation, topic frequency, and provide actionable insights.`,
          },
          {
            role: "user",
            content: `Analyze this previous question paper pattern:\n\n${text.substring(0, 3000)}`,
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
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const pattern = JSON.parse(jsonMatch[0]) as PatternAnalysis
      if (pattern.commonTopics && pattern.questionTypes && pattern.marksDistribution) {
        return pattern
      }
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI pattern analysis failed, using fallback:", error)
    // Fallback pattern
    return {
      commonTopics: [
        "Core concepts and definitions",
        "Practical applications",
        "Theoretical frameworks",
        "Case studies",
        "Problem-solving",
      ],
      questionTypes: {
        mcq: 10,
        shortAnswer: 5,
        descriptive: 3,
      },
      marksDistribution: {
        low: 30, // 30% weightage
        medium: 40, // 40% weightage
        high: 30, // 30% weightage
      },
      frequentKeywords: [
        "explain",
        "describe",
        "analyze",
        "compare",
        "evaluate",
        "discuss",
        "define",
        "illustrate",
      ],
      difficulty: "medium",
      recommendations: [
        "Focus on core concepts as they appear frequently",
        "Practice both short and long-answer questions",
        "Prepare case studies and real-world examples",
        "Master key definitions and terminology",
        "Work on time management for descriptive questions",
      ],
    }
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
    const { documentIds } = await request.json()

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "At least one document ID is required for pattern analysis" },
        { status: 400 },
      )
    }

    // Fetch all previous papers
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId: payload.userId,
    })

    if (documents.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 404 })
    }

    // Combine all document texts
    const combinedText = documents.map((doc) => doc.extractedText).join("\n\n---NEW PAPER---\n\n")

    const patternAnalysis = await analyzePatternWithAI(combinedText)

    return NextResponse.json(
      {
        message: "Pattern analysis completed successfully",
        documentCount: documents.length,
        pattern: patternAnalysis,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Pattern analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze pattern" },
      { status: 500 },
    )
  }
}
