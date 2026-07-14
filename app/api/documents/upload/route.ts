import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateFile, documentUploadSchema, validateRequest } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"
import { getDocumentSourceType } from "@/lib/documentUpload"
import { extractPdf, getPdfPageCount } from "@/lib/pdfExtractor"
import {
  createStructuredDocumentFromExtraction,
  createStructuredDocumentFromText,
  buildLegacyDocumentStructure,
} from "@/lib/documentPipeline"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Shared: text extraction for non-PDF files
// ---------------------------------------------------------------------------

async function extractFromFile(fileBuffer: Buffer, fileName: string): Promise<{ text: string }> {
  const fileNameLower = fileName.toLowerCase()

  try {
    if (fileNameLower.endsWith(".docx")) {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      return { text: result.value || "" }
    }

    const decoder = new TextDecoder("utf-8")
    return { text: decoder.decode(fileBuffer) }
  } catch (error) {
    logger.error("Text extraction error", { error: error instanceof Error ? error.message : String(error) })
    try {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(fileBuffer) }
    } catch {
      return { text: "" }
    }
  }
}

// ---------------------------------------------------------------------------
// Shared: background topic identification
// ---------------------------------------------------------------------------

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
        model: config.ai.models.topicIdentification,
        messages: [
          {
            role: "system",
            content:
              "You are an expert at analyzing academic and study materials to identify key topics. " +
              "Extract 3-8 main topics/concepts. Return ONLY a JSON array of topic strings, " +
              'e.g., ["Photosynthesis Process", "Cellular Respiration", "DNA Replication"]. ' +
              "Keep topics concise (2-5 words each) and academically meaningful.",
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

    return []
  } catch (error) {
    logger.error("Topic identification error", { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

async function processTopicsInBackground(documentId: string, text: string): Promise<void> {
  try {
    await connectDB()
    await Document.findByIdAndUpdate(documentId, { processingStatus: "processing" })

    const topics = await identifyTopics(text)

    await Document.findByIdAndUpdate(documentId, {
      topics,
      processingStatus: "completed",
      processingError: null,
    })
  } catch (error) {
    logger.error(`Background processing failed for document ${documentId}`, { error: error instanceof Error ? error.message : String(error) })
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// ---------------------------------------------------------------------------
// POST /api/documents/upload
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const security = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.upload,
      allowedMethods: ["POST"],
    })

    if (security.error) return addSecurityHeaders(security.error)
    if (!security.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    await connectDB()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = (formData.get("type") as string) || "study-material"

    const validation = await validateRequest(documentUploadSchema, { type })
    if (!validation.success) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Invalid document type", details: validation.errors },
          { status: 400 },
        ),
      )
    }
    const documentType = validation.data.type

    if (!file) {
      return addSecurityHeaders(NextResponse.json({ error: "File is required" }, { status: 400 }))
    }

    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return addSecurityHeaders(NextResponse.json({ error: fileValidation.error }, { status: 400 }))
    }

    const sourceType = getDocumentSourceType(file)
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const title = file.name.replace(/\.[^.]+$/, "")

    // Check page count for PDFs
    if (sourceType === "pdf") {
      const pageCount = await getPdfPageCount(fileBuffer)
      if (pageCount > config.processing.maxPages) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: `PDF exceeds maximum page limit of ${config.processing.maxPages}` },
            { status: 400 },
          ),
        )
      }
    }

    // Extract and build structured document
    let structured: Awaited<ReturnType<typeof createStructuredDocumentFromExtraction>>
      | ReturnType<typeof createStructuredDocumentFromText>
      | ReturnType<typeof buildLegacyDocumentStructure>

    if (sourceType === "pdf") {
      logger.info(`Extracting PDF: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`)
      const extractionResult = await extractPdf(fileBuffer, title)

      if (!extractionResult.extractedText || extractionResult.extractedText.trim().length === 0) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Could not extract text from PDF. The file may be password-protected or contain only images." },
            { status: 400 },
          ),
        )
      }

      structured = createStructuredDocumentFromExtraction(extractionResult, title)
      logger.info(
        `PDF extracted: ${extractionResult.metadata.pageCount} pages, ` +
        `${extractionResult.metadata.totalChars} chars, ` +
        `${extractionResult.metadata.scannedPages} scanned pages, ` +
        `${extractionResult.metadata.extractionTimeMs}ms`,
      )
    } else {
      const { text: extractedText } = await extractFromFile(fileBuffer, file.name)

      if (!extractedText || extractedText.trim().length === 0) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Could not extract text from file. Please ensure it's a valid file." },
            { status: 400 },
          ),
        )
      }

      structured = sourceType === "docx"
        ? createStructuredDocumentFromText(extractedText, title, { extractionMode: "docx" })
        : buildLegacyDocumentStructure(extractedText, title, { sourceType })
    }

    // Save to MongoDB (upsert on fileHash to handle re-uploads)
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
        },
      },
      { new: true, upsert: true },
    )

    // Background topic identification for study materials (non-blocking)
    if (documentType === "study-material") {
      processTopicsInBackground(document._id.toString(), structured.extractedText).catch((err) => {
        logger.error("Background topic processing failed", { error: err instanceof Error ? err.message : String(err) })
      })
    }

    return addSecurityHeaders(
      NextResponse.json(
        {
          document: {
            id: document._id,
            originalFileName: document.originalFileName,
            title: document.title,
            type: document.type,
            processingStatus: document.processingStatus,
            metadata: {
              pages: structured.metadata.pages,
              scannedPages: structured.metadata.scannedPages,
              warnings: structured.metadata.warnings,
            },
          },
          duplicate: false,
        },
        { status: 201 },
      ),
    )
  } catch (error) {
    logger.error("Upload error", { error: error instanceof Error ? error.message : String(error) })
    return addSecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    )
  }
}
