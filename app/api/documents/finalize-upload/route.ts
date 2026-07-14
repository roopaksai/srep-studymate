import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { validateRequest, documentUploadSchema } from "@/lib/validation"
import { rateLimitConfigs } from "@/lib/rateLimit"
import { readFile, readdir, unlink, rmdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { config } from "@/lib/config"
import { getDocumentSourceType } from "@/lib/documentUpload"
import { extractPdf, getPdfPageCount } from "@/lib/pdfExtractor"
import {
  createStructuredDocumentFromExtraction,
  createStructuredDocumentFromText,
  buildLegacyDocumentStructure,
} from "@/lib/documentPipeline"
import { prepareDocumentContent } from "@/lib/utils"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<{ text: string }> {
  const fileNameLower = fileName.toLowerCase()

  try {
    if (fileNameLower.endsWith(".docx")) {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value || "" }
    }

    const decoder = new TextDecoder("utf-8")
    return { text: decoder.decode(buffer) }
  } catch (error) {
    logger.error("Text extraction error", { error: error instanceof Error ? error.message : String(error) })
    return { text: "" }
  }
}

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
              "Extract 3-8 main topics/concepts. Return ONLY a JSON array of topic strings.",
          },
          {
            role: "user",
            content: `Analyze this study material and extract the main topics:\n\n${preparedText}`,
          },
        ],
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
// POST /api/documents/finalize-upload
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

    const body = await request.json()
    const { uploadId, fileName, type } = body

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

    if (!uploadId || !fileName) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Missing required fields" }, { status: 400 }),
      )
    }

    await connectDB()

    // Read all chunks and merge
    const uploadDir = join(tmpdir(), "uploads", uploadId)
    const files = await readdir(uploadDir)
    const chunkFiles = files
      .filter((f) => f.startsWith("chunk-"))
      .sort((a, b) => {
        const indexA = parseInt(a.split("-")[1])
        const indexB = parseInt(b.split("-")[1])
        return indexA - indexB
      })

    const chunks: Buffer[] = []
    for (const chunkFile of chunkFiles) {
      const chunkPath = join(uploadDir, chunkFile)
      const chunkBuffer = await readFile(chunkPath)
      chunks.push(chunkBuffer)
    }
    const completeBuffer = Buffer.concat(chunks)

    logger.info(
      `Merged ${chunkFiles.length} chunks, total size: ${(completeBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
    )

    const sourceType = getDocumentSourceType({
      name: fileName,
      type: fileName.endsWith(".pdf") ? "application/pdf" : "text/plain",
    } as File)

    // Check page count for PDFs
    if (sourceType === "pdf") {
      const pageCount = await getPdfPageCount(completeBuffer)
      if (pageCount > config.processing.maxPages) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: `PDF exceeds maximum page limit of ${config.processing.maxPages}` },
            { status: 400 },
          ),
        )
      }
    }

    const title = fileName.replace(/\.[^.]+$/, "")

    // Extract and build structured document
    let structured: Awaited<ReturnType<typeof createStructuredDocumentFromExtraction>>
      | ReturnType<typeof createStructuredDocumentFromText>
      | ReturnType<typeof buildLegacyDocumentStructure>

    if (sourceType === "pdf") {
      const extractionResult = await extractPdf(completeBuffer, title)

      if (!extractionResult.extractedText || extractionResult.extractedText.trim().length === 0) {
        // Cleanup chunks before returning error
        for (const chunkFile of chunkFiles) {
          await unlink(join(uploadDir, chunkFile)).catch(() => {})
        }
        await rmdir(uploadDir).catch(() => {})
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Could not extract text from PDF" },
            { status: 400 },
          ),
        )
      }

      structured = createStructuredDocumentFromExtraction(extractionResult, title)
    } else {
      const { text: extractedText } = await extractTextFromBuffer(completeBuffer, fileName)

      if (!extractedText || extractedText.trim().length === 0) {
        for (const chunkFile of chunkFiles) {
          await unlink(join(uploadDir, chunkFile)).catch(() => {})
        }
        await rmdir(uploadDir).catch(() => {})
        return addSecurityHeaders(
          NextResponse.json({ error: "Could not extract text from file" }, { status: 400 }),
        )
      }

      structured = sourceType === "docx"
        ? createStructuredDocumentFromText(extractedText, title, { extractionMode: "docx" })
        : buildLegacyDocumentStructure(extractedText, title, { sourceType })
    }

    const fileHash = crypto.createHash("sha256").update(completeBuffer).digest("hex")
    const document = await Document.findOneAndUpdate(
      { userId: security.userId, fileHash },
      {
        $set: {
          originalFileName: fileName,
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

    if (documentType === "study-material") {
      processTopicsInBackground(document._id.toString(), structured.extractedText).catch(() => {})
    }

    // Cleanup chunks
    for (const chunkFile of chunkFiles) {
      await unlink(join(uploadDir, chunkFile)).catch(() => {})
    }
    await rmdir(uploadDir).catch(() => {})

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
    logger.error("Finalize upload error", { error: error instanceof Error ? error.message : String(error) })
    return addSecurityHeaders(
      NextResponse.json({ error: "Failed to finalize upload" }, { status: 500 }),
    )
  }
}
