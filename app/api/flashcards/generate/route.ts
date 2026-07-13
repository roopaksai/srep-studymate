import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import FlashcardSet from "@/lib/models/FlashcardSet"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateRequest, generateFlashcardsSchema, isValidObjectId } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"
import { buildLegacyDocumentStructure } from "@/lib/documentPipeline"
import { generateFlashcardsFromChunks } from "@/lib/structuredAi"
import { withCache, generateAICacheKey, cacheTTL } from "@/lib/cache"

async function generateFlashcardsWithAI(text: string): Promise<{ question: string; answer: string }[]> {
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) {
      throw new Error(`${config.ai.provider} API key not configured`)
    }

    // Prepare document content adaptively based on size
    const preparedText = prepareDocumentContent(text)

    const systemPrompt = "You are an expert educator creating flashcards. Generate 10-12 high-quality flashcards from the provided study material. Cover all important concepts, definitions, and key facts. Return ONLY a JSON array with objects containing 'question' and 'answer' fields. Make questions clear and concise, and answers detailed but focused."

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add appropriate authorization header based on provider
    if (config.ai.provider === "openai") {
      headers["Authorization"] = `Bearer ${apiKey}`
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.ai.models.flashcards,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Create flashcards from this study material:\n\n${preparedText}`,
          },
        ],
        temperature: config.ai.temperature,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const cards = JSON.parse(jsonMatch[0])
      return cards.filter((card: any) => card.question && card.answer)
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    logger.warn('AI generation failed, using fallback', { error: error instanceof Error ? error.message : String(error) })
    // Fallback to simple extraction
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20).slice(0, 8)
    return sentences.map((sentence, index) => ({
      question: `What is the key concept ${index + 1} from the material?`,
      answer: sentence.trim(),
    }))
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with AI generation rate limiting
    const security = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.aiGeneration,
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)
    if (!security.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    await connectDB()
    const body = await request.json()
    
    // Validate input
    const validation = await validateRequest(generateFlashcardsSchema, body)
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      ))
    }
    
    const { documentId } = validation.data
    const reattempt = body.reattempt || false

    const document = await Document.findOne({
      _id: documentId,
      userId: security.userId,
    })

    if (!document) {
      logger.warn('Document not found for flashcard generation', { documentId, userId: security.userId })
      return addSecurityHeaders(NextResponse.json({ error: "Document not found" }, { status: 404 }))
    }

    if (document.processingStatus !== "completed") {
      return addSecurityHeaders(NextResponse.json(
        { error: "Document is still processing", processingStatus: document.processingStatus },
        { status: 409 },
      ))
    }

    // Check if flashcards already exist for this document (unless reattempt)
    if (!reattempt) {
      const existingFlashcardSet = await FlashcardSet.findOne({
        userId: security.userId,
        documentId,
      }).sort({ createdAt: -1 })

      if (existingFlashcardSet) {
        logger.info('Found existing flashcard set', { documentId, userId: security.userId })
        return addSecurityHeaders(NextResponse.json(
          {
            flashcardSet: {
              id: existingFlashcardSet._id,
              documentId: existingFlashcardSet.documentId.toString(),
              title: existingFlashcardSet.title,
              cards: existingFlashcardSet.cards,
              createdAt: existingFlashcardSet.createdAt,
            },
            isExisting: true, // Flag to indicate this is an existing set
          },
          { status: 200 },
        ))
      }
    } else {
      logger.info('Reattempt requested, generating new flashcard set', { documentId, userId: security.userId })
      // Delete old flashcard set if reattempt is true
      await FlashcardSet.deleteMany({
        userId: security.userId,
        documentId,
      })
    }

    const structuredChunks = document.chunks?.length
      ? document.chunks
      : buildLegacyDocumentStructure(document.extractedText || "", document.originalFileName).chunks

    // Generate flashcards from structured chunks (cached unless reattempt)
    const chunksKey = generateAICacheKey('flashcards', JSON.stringify(structuredChunks.map((c: any) => c.text || c).slice(0, 5)))
    const cards = reattempt
      ? await generateFlashcardsFromChunks(structuredChunks)
      : await withCache(chunksKey, () => generateFlashcardsFromChunks(structuredChunks), cacheTTL.aiGeneration)

    // Generate title: "doc name Flashcards" (strip file extension from originalFileName)
    const docNameWithoutExt = document.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')
    const flashcardTitle = `${docNameWithoutExt} Flashcards`

    const flashcardSet = new FlashcardSet({
      userId: security.userId,
      documentId,
      title: flashcardTitle,
      cards,
    })

    await flashcardSet.save()

    logger.info('Flashcard set created', { flashcardSetId: flashcardSet._id, userId: security.userId })

    return addSecurityHeaders(NextResponse.json(
      {
        flashcardSet: {
          id: flashcardSet._id,
          documentId: flashcardSet.documentId.toString(),
          title: flashcardSet.title,
          cards: flashcardSet.cards,
          createdAt: flashcardSet.createdAt,
        },
        isExisting: false, // This is a newly generated set
      },
      { status: 201 },
    ))
  } catch (error) {
    logger.error('Generate flashcards error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    return addSecurityHeaders(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}
