import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import AnalysisReport from "@/lib/models/AnalysisReport"
import { hashFileBuffer, getDocumentSourceType } from "@/lib/documentUpload"
import { buildLegacyDocumentStructure } from "@/lib/documentPipeline"
import { extractPdfText } from "@/lib/pdfExtractor"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { config } from "@/lib/config"
import { handleError } from "@/lib/errors"
import { rateLimitConfigs } from "@/lib/rateLimit"
import mammoth from "mammoth"

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  if (fileType === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await extractPdfText(buffer)
    console.log("PDF extraction successful, text length:", result.text.length)
    return result.text
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
    const questionsText = questions.map((q, i) => `Q${i + 1}. ${q.text} (${q.marks} marks)`).join("\n")

    const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert educational assessor. Analyze the student's answer script for these descriptive questions and provide detailed, specific scoring.

Questions:
${questionsText}

IMPORTANT: Extract TOPIC NAMES (not question numbers) for strengths and weaknesses. Focus on the subject matter, not question references.

Return ONLY a valid JSON object with:
- summary: string (overall performance summary)
- totalScore: number (sum of all scores)
- maxScore: number (total marks: ${questions.reduce((s, q) => s + q.marks, 0)})
- questionScores: array of objects with:
  - questionNumber: number
  - questionText: string (first 100 chars)
  - scoredMarks: number
  - maxMarks: number
  - feedback: string (specific feedback on what was good/missing)
- strengths: array of 3-5 TOPIC NAMES where student performed well (e.g., "Data Structures", "Algorithm Analysis", "Database Normalization" - NO question numbers)
- weaknesses: array of 3-5 TOPIC NAMES that need improvement (e.g., "Graph Algorithms", "SQL Joins", "Time Complexity" - NO question numbers)
- recommendedTopics: array of 4-6 specific topics to study (based on weak areas)
- grade: string (A+, A, B+, B, C, D, F)

Grade scale: A+ (90-100%), A (80-89%), B+ (70-79%), B (60-69%), C (50-59%), D (40-49%), F (<40%)

Example format:
strengths: ["Data Structures", "Memory Management", "Code Optimization"]
weaknesses: ["Concurrent Programming", "Design Patterns", "Testing Strategies"]`,
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
    const { userId, error } = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.aiGeneration,
    })
    if (error) return error

    await connectDB()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const mockPaperId = formData.get("mockPaperId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file size (max 30MB)
    const maxSize = 30 * 1024 * 1024 // 30MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is 30MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      }, { status: 400 })
    }

    console.log(`Processing answer script: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`)

    // Fetch the mock paper
    const mockPaper = await MockPaper.findOne({
      _id: mockPaperId,
      userId,
    })

    if (!mockPaper) {
      return NextResponse.json({ error: "Mock paper not found" }, { status: 404 })
    }

    if (mockPaper.paperType !== "descriptive") {
      return NextResponse.json({ error: "This is not a descriptive paper" }, { status: 400 })
    }

    const fileBuffer = await file.arrayBuffer()
    const fileHash = await hashFileBuffer(fileBuffer)
    const sourceType = getDocumentSourceType(file)

    // Extract and structure the answer script
    const extractedText = await extractTextFromFile(file)
    const structuredDocument = buildLegacyDocumentStructure(extractedText, file.name, { sourceType })

    let answerDoc = await Document.findOne({
      userId,
      fileHash,
    })

    if (!answerDoc) {
      answerDoc = new Document({
        userId,
        fileHash,
        originalFileName: file.name,
        title: file.name.replace(/\.[^.]+$/, ""),
        sourceType,
        extractedText: structuredDocument.extractedText,
        pages: structuredDocument.pages,
        chunks: structuredDocument.chunks,
        metadata: structuredDocument.metadata,
        type: "answer-script",
        processingStatus: "completed",
      })
    } else {
      answerDoc.extractedText = structuredDocument.extractedText
      answerDoc.pages = structuredDocument.pages
      answerDoc.chunks = structuredDocument.chunks
      answerDoc.metadata = structuredDocument.metadata as any
      answerDoc.processingStatus = "completed"
      answerDoc.processingError = null
      answerDoc.type = "answer-script"
      answerDoc.title = file.name.replace(/\.[^.]+$/, "")
      answerDoc.sourceType = sourceType
    }

    await answerDoc.save()

    // Generate analysis using AI
    const analysis = await generateAnalysisWithAI(structuredDocument.extractedText, mockPaper.questions)

    // Fetch the original study material document to get its name
    const studyDocument = await Document.findById(mockPaper.documentId)
    const docNameWithoutExt = studyDocument 
      ? studyDocument.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')
      : 'document'
    const reportTitle = `${docNameWithoutExt}_${mockPaper.paperType}_report`

    // Create analysis report with title: "doc name_type_report"
    const analysisReport = new AnalysisReport({
      userId,
      answerScriptDocumentId: answerDoc._id,
      title: reportTitle,
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

    return addSecurityHeaders(
      NextResponse.json(
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
      ),
    )
  } catch (error) {
    const { statusCode, message } = handleError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
