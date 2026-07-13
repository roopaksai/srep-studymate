import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"
import { combineChunksToText } from "@/lib/documentPipeline"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { handleError } from "@/lib/errors"
import { rateLimitConfigs } from "@/lib/rateLimit"

async function identifyTopics(text: string): Promise<string[]> {
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) return []

    const preparedText = prepareDocumentContent(text)

    const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing academic and study materials to identify key topics. " +
              "Extract 3-8 main topics/concepts. Return ONLY a JSON array of topic strings.",
          },
          {
            role: "user",
            content: `Analyze this study material and extract the main topics:\n\n${preparedText}`,
          },
        ],
        temperature: config.ai.temperature,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return []

    const jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const topics = JSON.parse(jsonMatch[0])
      return Array.isArray(topics) ? topics.slice(0, 8) : []
    }

    const lines = content.split("\n").filter((line: string) => line.trim())
    return lines.slice(0, 8).map((line: string) => line.replace(/^[-*•]\s*/, "").trim())
  } catch (error) {
    console.error("Topic identification error:", error)
    return []
  }
}

/**
 * POST /api/documents/process
 * Manually trigger or retry topic processing for a document
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.aiGeneration,
    })
    if (error) return error

    const { documentId } = await request.json()

    if (!documentId) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Document ID is required" }, { status: 400 })
      )
    }

    await connectDB()

    const document = await Document.findOne({
      _id: documentId,
      userId,
    })

    if (!document) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Document not found" }, { status: 404 })
      )
    }

    document.processingStatus = "processing"
    document.processingError = null
    await document.save()

    try {
      const sourceText = document.chunks?.length
        ? combineChunksToText(document.chunks)
        : document.extractedText || ""

      const topics = await identifyTopics(sourceText)

      document.topics = topics
      document.processingStatus = "completed"
      document.processingError = null
      await document.save()

      return addSecurityHeaders(NextResponse.json({
        success: true,
        document: {
          id: document._id,
          topics: document.topics,
          processingStatus: document.processingStatus,
        },
      }))
    } catch (error) {
      console.error("Topic processing error:", error)
      document.processingStatus = "failed"
      document.processingError = error instanceof Error ? error.message : "Unknown error"
      await document.save()

      const err = handleError(error)
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Failed to process topics", details: err.message },
          { status: err.statusCode },
        )
      )
    }
  } catch (error) {
    const err = handleError(error)
    return addSecurityHeaders(
      NextResponse.json({ error: err.message }, { status: err.statusCode })
    )
  }
}
