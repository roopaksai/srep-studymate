import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import { buildLegacyDocumentStructure } from "@/lib/documentPipeline"
import { generateQuestionsFromChunks } from "@/lib/structuredAi"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { handleError } from "@/lib/errors"
import { withCache, generateAICacheKey, cacheTTL } from "@/lib/cache"
import { rateLimitConfigs } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.aiGeneration,
    })
    if (error) return error

    await connectDB()
    const { documentId, title, questionType = "mixed", reattempt = false } = await request.json()

    // Validate question type
    if (!["mcq", "descriptive", "mixed"].includes(questionType)) {
      return NextResponse.json(
        { error: "Invalid questionType. Must be 'mcq', 'descriptive', or 'mixed'" },
        { status: 400 }
      )
    }

    const document = await Document.findOne({
      _id: documentId,
      userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.processingStatus !== "completed") {
      return NextResponse.json(
        { error: "Document is still processing", processingStatus: document.processingStatus },
        { status: 409 },
      )
    }

    // Check if a paper of this type already exists for this document (unless reattempt)
    if (!reattempt) {
      const existingPaper = await MockPaper.findOne({
        userId,
        documentId,
        paperType: questionType,
      }).sort({ createdAt: -1 })

      if (existingPaper) {
        logger.info('Found existing paper', { questionType, documentId, userId })
        return addSecurityHeaders(
          NextResponse.json(
            {
              mockPaper: {
                id: existingPaper._id,
                documentId: existingPaper.documentId,
                title: existingPaper.title,
                paperType: existingPaper.paperType,
                questions: existingPaper.questions,
                totalMarks: existingPaper.questions.reduce(
                  (sum: number, q: { marks: number }) => sum + (q.marks || 0),
                  0,
                ),
                createdAt: existingPaper.createdAt,
              },
              isExisting: true, // Flag to indicate this is an existing paper
            },
            { status: 200 },
          ),
        )
      }
    } else {
      logger.info('Reattempt requested, generating new paper', { questionType, documentId, userId })
      // Delete old paper of this type if reattempt is true
      await MockPaper.deleteMany({
        userId,
        documentId,
        paperType: questionType,
      })
    }

    const structuredChunks = document.chunks?.length
      ? document.chunks
      : buildLegacyDocumentStructure(document.extractedText || "", document.originalFileName).chunks

    const questions = reattempt
      ? await generateQuestionsFromChunks(structuredChunks, questionType as 'mcq' | 'descriptive' | 'mixed')
      : await withCache(
          generateAICacheKey('mock-paper', `${documentId}:${questionType}`),
          () => generateQuestionsFromChunks(structuredChunks, questionType as 'mcq' | 'descriptive' | 'mixed'),
          cacheTTL.aiGeneration,
        )

    // Generate title: "doc name_type_mock paper" (strip file extension from originalFileName)
    const docNameWithoutExt = document.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')
    const paperTitle = `${docNameWithoutExt} ${questionType} Paper`

    const mockPaper = new MockPaper({
      userId,
      documentId,
      title: paperTitle,
      paperType: questionType,
      questions,
    })

    await mockPaper.save()

    return addSecurityHeaders(
      NextResponse.json(
        {
          mockPaper: {
            id: mockPaper._id,
            documentId: mockPaper.documentId,
            title: mockPaper.title,
            paperType: mockPaper.paperType,
            questions: mockPaper.questions,
            totalMarks: mockPaper.questions.reduce(
              (sum: number, q: { text: string; marks: number }) => sum + (q.marks || 0),
              0,
            ),
            createdAt: mockPaper.createdAt,
          },
          isExisting: false, // This is a newly generated paper
        },
        { status: 201 },
      ),
    )
  } catch (error) {
    const { statusCode, message } = handleError(error)
    return NextResponse.json(
      { 
        error: "Failed to generate questions from document",
        details: message,
        suggestion: "Please try again or reattempt the generation"
      }, 
      { status: statusCode }
    )
  }
}
