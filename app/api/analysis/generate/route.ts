import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { verifyToken } from "@/lib/auth"

async function generateAnalysisWithAI(answerText: string): Promise<{
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
}> {
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
            content: `You are an expert educational assessor. Analyze the student's answer script and provide constructive feedback. Return ONLY a JSON object with these fields:
- summary: string (2-3 sentences overview)
- strengths: array of 3-4 strings
- weaknesses: array of 3-4 strings
- recommendedTopics: array of 4-5 strings (topics to study)`,
          },
          {
            role: "user",
            content: `Analyze this student answer script:\n\n${answerText.substring(0, 3000)}`,
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
      const analysis = JSON.parse(jsonMatch[0])
      if (analysis.summary && analysis.strengths && analysis.weaknesses && analysis.recommendedTopics) {
        return analysis
      }
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI generation failed, using fallback:", error)
    // Fallback analysis
    return {
      summary: "The answer script shows understanding of basic concepts but needs more depth in explanations and examples.",
      strengths: [
        "Clear writing and structure",
        "Good attempt at core concepts",
        "Relevant topic coverage",
      ],
      weaknesses: [
        "Could provide more detailed explanations",
        "Needs more examples and illustrations",
        "Some topics need deeper understanding",
      ],
      recommendedTopics: [
        "In-depth concept analysis",
        "Practical application examples",
        "Advanced problem-solving techniques",
        "Critical thinking and analysis",
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
    const { answerScriptDocumentId } = await request.json()

    const document = await Document.findOne({
      _id: answerScriptDocumentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const analysis = await generateAnalysisWithAI(document.extractedText)

    const report = new AnalysisReport({
      userId: payload.userId,
      answerScriptDocumentId,
      ...analysis,
    })

    await report.save()

    return NextResponse.json(
      {
        report: {
          id: report._id,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          recommendedTopics: report.recommendedTopics,
          createdAt: report.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate analysis error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
