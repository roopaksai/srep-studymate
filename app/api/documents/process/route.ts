import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"

async function identifyTopics(text: string): Promise<string[]> {
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) {
      console.warn(`${config.ai.provider} API key not configured, returning empty topics`)
      return []
    }

    // Prepare document content adaptively based on size
    const preparedText = prepareDocumentContent(text)

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
        model: config.ai.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing academic and study materials to identify key topics. Your task is to extract 3-8 main topics/concepts by analyzing the CONTENT itself, not relying on headings or table of contents. Look for:\n" +
              "- Recurring themes and concepts\n" +
              "- Subject matter that is explained in detail\n" +
              "- Technical terms or theories being discussed\n" +
              "- Problems or case studies presented\n" +
              "- Key formulas, processes, or methodologies\n\n" +
              "Return ONLY a JSON array of topic strings, e.g., [\"Photosynthesis Process\", \"Cellular Respiration\", \"DNA Replication\"]. Keep topics concise (2-5 words each) and academically meaningful.",
          },
          {
            role: "user",
            content: `Analyze this study material and extract the main topics being discussed. Focus on the actual content, not just headings:\n\n${preparedText}`,
          },
        ],
        temperature: config.ai.temperature,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`AI API error (${response.status}): ${errorData}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return []
    }

    // Try to parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const topics = JSON.parse(jsonMatch[0])
      return Array.isArray(topics) ? topics.slice(0, 8) : []
    }

    // Fallback: split by lines and extract topic-like strings
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
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    await connectDB()

    const document = await Document.findOne({ 
      _id: documentId, 
      userId: payload.userId 
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Update status to processing
    document.processingStatus = "processing"
    document.processingError = null
    await document.save()

    try {
      // Identify topics using AI
      const topics = await identifyTopics(document.extractedText)
      
      // Update document with topics and mark as completed
      document.topics = topics
      document.processingStatus = "completed"
      document.processingError = null
      await document.save()

      return NextResponse.json({
        success: true,
        document: {
          id: document._id,
          topics: document.topics,
          processingStatus: document.processingStatus,
        },
      })
    } catch (error) {
      console.error("Topic processing error:", error)
      document.processingStatus = "failed"
      document.processingError = error instanceof Error ? error.message : "Unknown error"
      await document.save()

      return NextResponse.json(
        { error: "Failed to process topics", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Process endpoint error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
