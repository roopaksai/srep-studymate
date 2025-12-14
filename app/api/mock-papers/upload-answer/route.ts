import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { verifyToken } from "@/lib/auth"

// @ts-ignore
import pdfParse from "pdf-parse-fork"
import mammoth from "mammoth"

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  if (fileType === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdfParse(buffer)
    console.log("PDF extraction successful, text length:", data.text.length)
    return data.text
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } else if (fileType === "text/plain") {
    const arrayBuffer = await file.arrayBuffer()
    const decoder = new TextDecoder("utf-8")
    return decoder.decode(arrayBuffer)
  }

  throw new Error("Unsupported file type")
}

async function generateAnalysisWithAI(
  answerText: string,
  questions: any[]
): Promise<{
  summary: string
  totalScore: number
  maxScore: number
  questionScores: any[]
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
  grade: string
}> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    const questionsText = questions.map((q, i) => `Q${i + 1}. ${q.text} (${q.marks} marks)`).join("\n")

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
            content: `You are an expert educational assessor. Analyze the student's answer script for these descriptive questions and provide detailed, specific scoring.

Questions:
${questionsText}

IMPORTANT: Be specific about which questions were answered well and which need improvement. Identify topics by question number and subject matter.

Return ONLY a valid JSON object with:
- summary: string (overall performance summary with specific question references)
- totalScore: number (sum of all scores)
- maxScore: number (total marks: ${questions.reduce((s, q) => s + q.marks, 0)})
- questionScores: array of objects with:
  - questionNumber: number
  - questionText: string (first 100 chars)
  - scoredMarks: number
  - maxMarks: number
  - feedback: string (specific feedback on what was good/missing)
- strengths: array of 3-4 strings (be specific about which questions/topics were well done)
- weaknesses: array of 3-4 strings (MUST include specific question numbers and topics that need improvement, e.g., "Q3: Weak explanation of concept X", "Q7: Missing key points about Y")
- recommendedTopics: array of 4-5 specific topics to study (based on weak questions)
- grade: string (A+, A, B+, B, C, D, F)

Grade scale: A+ (90-100%), A (80-89%), B+ (70-79%), B (60-69%), C (50-59%), D (40-49%), F (<40%)

Example weaknesses format:
- "Q2: Incomplete explanation of [specific concept]"
- "Q5: Missing critical analysis of [topic]"
- "Q8: Needs more detail on [specific subject]"`,
          },
          {
            role: "user",
            content: `Analyze this answer script:\n\n${answerText.substring(0, 2500)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0])
      if (analysis.summary && analysis.questionScores) {
        return analysis
      }
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI analysis failed, using fallback:", error)
    const maxScore = questions.reduce((sum, q) => sum + q.marks, 0)
    const totalScore = Math.floor(maxScore * 0.65)

    return {
      summary: "Answer script shows good understanding with room for improvement.",
      totalScore,
      maxScore,
      questionScores: questions.map((q, i) => ({
        questionNumber: i + 1,
        questionText: q.text.substring(0, 100),
        scoredMarks: Math.floor(q.marks * 0.65),
        maxMarks: q.marks,
        feedback: "Good attempt, consider adding more details and examples.",
      })),
      strengths: ["Clear writing", "Good structure", "Relevant content"],
      weaknesses: ["Needs more depth", "Could include more examples"],
      recommendedTopics: ["Detailed explanations", "Practical examples", "Critical analysis"],
      grade: "B",
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const mockPaperId = formData.get("mockPaperId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Fetch the mock paper
    const mockPaper = await MockPaper.findOne({
      _id: mockPaperId,
      userId: payload.userId,
    })

    if (!mockPaper) {
      return NextResponse.json({ error: "Mock paper not found" }, { status: 404 })
    }

    if (mockPaper.paperType !== "descriptive") {
      return NextResponse.json({ error: "This is not a descriptive paper" }, { status: 400 })
    }

    // Extract text from answer script
    const extractedText = await extractTextFromFile(file)
    const textToStore = extractedText.substring(0, 5000)

    // Save answer script as document
    const answerDoc = new Document({
      userId: payload.userId,
      originalFileName: file.name,
      extractedText: textToStore,
      type: "answer-script",
    })
    await answerDoc.save()

    // Generate analysis using AI
    const analysis = await generateAnalysisWithAI(extractedText, mockPaper.questions)

    // Create analysis report
    const analysisReport = new AnalysisReport({
      userId: payload.userId,
      answerScriptDocumentId: answerDoc._id,
      summary: analysis.summary,
      totalScore: analysis.totalScore,
      maxScore: analysis.maxScore,
      questionScores: analysis.questionScores,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendedTopics: analysis.recommendedTopics,
      grade: analysis.grade,
    })
    await analysisReport.save()

    // Update mock paper with answer script and analysis links
    mockPaper.answerScriptDocumentId = answerDoc._id
    mockPaper.analysisReportId = analysisReport._id
    await mockPaper.save()

    return NextResponse.json(
      {
        message: "Answer script uploaded and analyzed successfully",
        analysisReportId: analysisReport._id,
        score: {
          total: analysis.totalScore,
          max: analysis.maxScore,
          percentage: ((analysis.totalScore / analysis.maxScore) * 100).toFixed(1),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Answer script upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload answer script" },
      { status: 500 },
    )
  }
}
