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
import { getDocumentSourceType, queueDocumentForProcessing } from "@/lib/documentUpload"
import { extractPdfText, getPdfPageCount, type PdfPageData } from "@/lib/pdfExtractor"
import { createStructuredDocumentFromPages, buildLegacyDocumentStructure } from "@/lib/documentPipeline"

interface ExtractResult {
  text: string
  pages?: PdfPageData[]
}

async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<ExtractResult> {
  const fileNameLower = fileName.toLowerCase()

  try {
    if (fileNameLower.endsWith(".pdf")) {
      const result = await extractPdfText(buffer)
      return { text: result.text || "", pages: result.pages }
    } else if (fileNameLower.endsWith(".docx")) {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value || "" }
    } else if (fileNameLower.endsWith(".txt")) {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(buffer) }
    } else {
      const decoder = new TextDecoder("utf-8")
      return { text: decoder.decode(buffer) }
    }
  } catch (error) {
    console.error("Text extraction error:", error)
    return { text: "" }
  }
}

async function identifyTopics(text: string): Promise<string[]> {
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) {
      return []
    }

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
              "You are an expert at analyzing academic and study materials to identify key topics. Extract 3-8 main topics/concepts. Return ONLY a JSON array of topic strings.",
          },
          {
            role: "user",
            content: `Analyze this study material and extract the main topics:\n\n${text.substring(0, 3000)}`,
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
    console.error("Topic identification error:", error)
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
    console.error(`Background processing failed for document ${documentId}:`, error)
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Finalize chunked upload by merging chunks and processing
 * POST /api/documents/finalize-upload
 */
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const security = await secureRoute(request, {
      requireAuth: true,
      rateLimit: rateLimitConfigs.upload,
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)
    if (!security.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    const body = await request.json()
    const { uploadId, fileName, type } = body
    
    // Validate document type
    const validation = await validateRequest(documentUploadSchema, { type })
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid document type', details: validation.errors },
        { status: 400 }
      ))
    }
    const documentType = validation.data.type

    if (!uploadId || !fileName) {
      return addSecurityHeaders(NextResponse.json({ error: "Missing required fields" }, { status: 400 }))
    }

    await connectDB()

    // Read all chunks and merge
    const uploadDir = join(tmpdir(), "uploads", uploadId)
    const files = await readdir(uploadDir)
    const chunkFiles = files.filter(f => f.startsWith("chunk-")).sort((a, b) => {
      const indexA = parseInt(a.split("-")[1])
      const indexB = parseInt(b.split("-")[1])
      return indexA - indexB
    })

    // Merge chunks into single buffer
    const chunks: Buffer[] = []
    for (const chunkFile of chunkFiles) {
      const chunkPath = join(uploadDir, chunkFile)
      const chunkBuffer = await readFile(chunkPath)
      chunks.push(chunkBuffer)
    }
    const completeBuffer = Buffer.concat(chunks)

    console.log(`Merged ${chunkFiles.length} chunks, total size: ${(completeBuffer.length / (1024 * 1024)).toFixed(2)}MB`)

    const sourceType = getDocumentSourceType({ name: fileName, type: fileName.endsWith(".pdf") ? "application/pdf" : "text/plain" } as File)
    let pageCount: number | null = null
    if (sourceType === "pdf") {
      pageCount = await getPdfPageCount(completeBuffer)
      if (pageCount > config.processing.maxPages) {
        return addSecurityHeaders(NextResponse.json(
          { error: `PDF exceeds maximum page limit of ${config.processing.maxPages}` },
          { status: 400 },
        ))
      }
    }

    const uploadFile = new File([Buffer.from(completeBuffer)], fileName, {
      type: sourceType === "pdf"
        ? "application/pdf"
        : sourceType === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : sourceType === "doc"
            ? "application/msword"
            : "text/plain",
    })

    // Try Python processor first
    try {
      const queued = await queueDocumentForProcessing({
        userId: security.userId,
        file: uploadFile,
        documentType,
        pageCount,
      })

      // Cleanup chunks
      for (const chunkFile of chunkFiles) {
        await unlink(join(uploadDir, chunkFile)).catch(() => {})
      }
      await rmdir(uploadDir).catch(() => {})

      return addSecurityHeaders(NextResponse.json({
        document: {
          id: queued.documentId,
          resultId: queued.resultId,
          jobId: queued.jobId,
          originalFileName: fileName,
          type: documentType,
          processingStatus: queued.status,
        },
        duplicate: queued.duplicate,
      }, { status: queued.duplicate ? 200 : 202 }))
    } catch (processorError) {
      console.warn("Python processor unavailable, falling back to local extraction:", processorError)
    }

    // Fall back to local extraction
    const { text: extractedText, pages: extractedPages } = await extractTextFromBuffer(completeBuffer, fileName)


    if (!extractedText || extractedText.trim().length === 0) {
      for (const chunkFile of chunkFiles) {
        await unlink(join(uploadDir, chunkFile)).catch(() => {})
      }
      await rmdir(uploadDir).catch(() => {})
      return addSecurityHeaders(NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      ))
    }

    const title = fileName.replace(/\.[^.]+$/, "")
    const structured = extractedPages
      ? createStructuredDocumentFromPages(extractedPages, title, {
          extractionMode: `local-${sourceType}`,
          confidence: 0.9,
        })
      : buildLegacyDocumentStructure(extractedText, title, { sourceType })

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
        }
      },
      { new: true, upsert: true }
    )

    if (documentType === "study-material") {
      processTopicsInBackground(document._id.toString(), structured.extractedText).catch(() => {})
    }

    // Cleanup chunks
    for (const chunkFile of chunkFiles) {
      await unlink(join(uploadDir, chunkFile)).catch(() => {})
    }
    await rmdir(uploadDir).catch(() => {})

    return addSecurityHeaders(NextResponse.json({
      document: {
        id: document._id,
        originalFileName: document.originalFileName,
        title: document.title,
        type: document.type,
        processingStatus: document.processingStatus,
      },
      duplicate: false,
    }, { status: 201 }))
  } catch (error) {
    console.error("Finalize upload error:", error)
    return addSecurityHeaders(NextResponse.json({ error: "Failed to finalize upload" }, { status: 500 }))
  }
}
