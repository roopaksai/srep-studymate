import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateFile, documentUploadSchema, validateRequest } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"
import { getDocumentSourceType, queueDocumentForProcessing } from "@/lib/documentUpload"
import { extractPdfText, getPdfPageCount, type PdfPageData } from "@/lib/pdfExtractor"
import { createStructuredDocumentFromPages, buildLegacyDocumentStructure } from "@/lib/documentPipeline"

interface ExtractResult {
  text: string
  pages?: PdfPageData[]
}

async function extractFromFile(fileBuffer: Buffer, fileName: string): Promise<ExtractResult> {
  const fileNameLower = fileName.toLowerCase()

  try {
    if (fileNameLower.endsWith(".pdf")) {
      const result = await extractPdfText(fileBuffer)
      console.log("PDF extraction successful, text length:", result.text?.length || 0, `(${result.pages.length} pages)`)
      return { text: result.text || "", pages: result.pages }
    } else if (fileNameLower.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth")
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        console.log("DOCX extraction successful, text length:", result.value?.length || 0)
        return { text: result.value || "" }
      } catch (docxError) {
        console.error("DOCX parsing failed:", docxError)
        throw new Error("Failed to extract text from DOCX: " + (docxError as Error).message)
      }
    } else if (fileNameLower.endsWith(".txt")) {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(fileBuffer) }
    } else {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(fileBuffer) }
    }
  } catch (error) {
    console.error("Text extraction error:", error)
    try {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(fileBuffer) }
    } catch {
      return { text: "" }
    }
  }
}

async function processTopicsInBackground(documentId: string, text: string): Promise<void> {
  try {
    await connectDB()
    
    // Update status to processing
    await Document.findByIdAndUpdate(documentId, { processingStatus: "processing" })
    
    // Identify topics using AI
    const topics = await identifyTopics(text)
    
    // Update document with topics and mark as completed
    await Document.findByIdAndUpdate(documentId, {
      topics,
      processingStatus: "completed",
      processingError: null,
    })
    
    console.log(`Background processing completed for document ${documentId}`)
  } catch (error) {
    console.error(`Background processing failed for document ${documentId}:`, error)
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

async function identifyTopics(text: string): Promise<string[]> {
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) {
      console.warn(`${config.ai.provider} API key not configured, returning empty topics`)
      return []
    }

    // Prepare document content adaptively based on size
    // Small docs: use all content
    // Large docs: extract key sections
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

export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with upload rate limiting
    const security = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.upload,
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)
    if (!security.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    await connectDB()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = (formData.get("type") as string) || "study-material"
    
    // Validate file type field
    const validation = await validateRequest(documentUploadSchema, { type })
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid document type', details: validation.errors },
        { status: 400 }
      ))
    }
    const documentType = validation.data.type

    if (!file) {
      return addSecurityHeaders(NextResponse.json({ error: "File is required" }, { status: 400 }))
    }
    
    // Validate file
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return addSecurityHeaders(NextResponse.json({ error: fileValidation.error }, { status: 400 }))
    }

    const sourceType = getDocumentSourceType(file)
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    let pageCount: number | null = null

    if (sourceType === "pdf") {
      pageCount = await getPdfPageCount(fileBuffer)
      if (pageCount > config.processing.maxPages) {
        return addSecurityHeaders(NextResponse.json(
          { error: `PDF exceeds maximum page limit of ${config.processing.maxPages}` },
          { status: 400 },
        ))
      }
    }

    // Try to queue for Python processor; fall back to local extraction if unavailable
    try {
      // Pass a fresh File backed by a cloned buffer to prevent detaching the main fileBuffer
      const clonedFileForQueue = new File([Buffer.from(fileBuffer)], file.name, { type: file.type })
      const queued = await queueDocumentForProcessing({
        userId: security.userId,
        file: clonedFileForQueue,
        documentType,
        pageCount,
      })

      return addSecurityHeaders(NextResponse.json(
        {
          document: {
            id: queued.documentId,
            resultId: queued.resultId,
            jobId: queued.jobId,
            originalFileName: file.name,
            type: documentType,
            processingStatus: queued.status,
          },
          duplicate: queued.duplicate,
        },
        { status: queued.duplicate ? 200 : 202 },
      ))
    } catch (processorError) {
      console.warn("Python document processor unavailable, falling back to local extraction:", processorError)
    }

    // Local extraction fallback (when Python service is down)
    console.log(`Processing document locally: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`)
    const { text: extractedText, pages: extractedPages } = await extractFromFile(fileBuffer, file.name)

    if (!extractedText || extractedText.trim().length === 0) {
      return addSecurityHeaders(NextResponse.json(
        { error: "Could not extract text from file. Please ensure it's a valid PDF, DOCX, or TXT file." },
        { status: 400 }
      ))
    }

    // Build structured document from page-by-page data (PDF) or legacy text (DOCX/TXT)
    const title = file.name.replace(/\.[^.]+$/, "")
    const structured = extractedPages
      ? createStructuredDocumentFromPages(extractedPages, title, {
          extractionMode: `local-${sourceType}`,
          confidence: 0.9,
        })
      : buildLegacyDocumentStructure(extractedText, title, { sourceType })

    // Save document with full structured data to MongoDB (upsert to handle cases where queueDocumentForProcessing already created a record before failing)
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex")
    const document = await Document.findOneAndUpdate(
      { userId: security.userId, fileHash },
      {
        $set: {
          originalFileName: file.name,
          title,
          sourceType,
          type: documentType,
          pages: structured.pages,
          chunks: structured.chunks,
          extractedText: structured.extractedText,
          metadata: structured.metadata,
          topics: [],
          processingStatus: documentType === "study-material" ? "pending" : "completed",
          processingError: null,
        }
      },
      { new: true, upsert: true }
    )

    // Trigger background topic identification for study materials (non-blocking)
    if (documentType === "study-material") {
      processTopicsInBackground(document._id.toString(), structured.extractedText).catch((err) => {
        console.error("Background topic processing failed:", err)
      })
    }

    return addSecurityHeaders(NextResponse.json(
      {
        document: {
          id: document._id,
          originalFileName: document.originalFileName,
          title: document.title,
          type: document.type,
          processingStatus: document.processingStatus,
        },
        duplicate: false,
      },
      { status: 201 },
    ))
  } catch (error) {
    console.error("Upload error:", error)
    return addSecurityHeaders(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}
