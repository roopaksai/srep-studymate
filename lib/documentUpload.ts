import crypto from "crypto"
import connectDB from "@/lib/db"
import { config } from "@/lib/config"
import Document from "@/lib/models/Document"
import DocumentJob from "@/lib/models/DocumentJob"
import { sendDocumentToProcessor } from "@/lib/services/documentProcessorClient"

export type DocumentSourceType = "pdf" | "docx" | "doc" | "txt"

export interface QueuedDocumentResponse {
  duplicate: boolean
  jobId?: string
  documentId: string
  resultId: string
  status: string
}

export interface QueueDocumentParams {
  userId: string
  file: File
  fileBuffer?: Buffer
  documentType: "study-material" | "answer-script"
  pageCount?: number | null
}

export function getDocumentSourceType(file: File): DocumentSourceType {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".pdf") || file.type === "application/pdf") return "pdf"
  if (fileName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx"
  if (fileName.endsWith(".doc") || file.type === "application/msword") return "doc"
  return "txt"
}

export async function hashFileBuffer(buffer: Buffer | ArrayBuffer): Promise<string> {
  return crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex")
}



export async function queueDocumentForProcessing(params: QueueDocumentParams): Promise<QueuedDocumentResponse> {
  await connectDB()

  const sourceType = getDocumentSourceType(params.file)
  const rawBuffer = params.fileBuffer ?? Buffer.from(await params.file.arrayBuffer())
  const fileHash = await hashFileBuffer(rawBuffer)

  const existingDocument = await Document.findOne({ userId: params.userId, fileHash })
  if (existingDocument) {
    const existingJob = existingDocument.jobId
      ? await DocumentJob.findOne({ jobId: existingDocument.jobId, userId: params.userId })
      : null

    return {
      duplicate: true,
      jobId: existingDocument.jobId || existingJob?.jobId || undefined,
      documentId: existingDocument._id.toString(),
      resultId: existingDocument._id.toString(),
      status: existingDocument.processingStatus,
    }
  }

  const normalizedPageCount = params.pageCount ?? null
  if (sourceType === "pdf" && normalizedPageCount && normalizedPageCount > config.processing.maxPages) {
    throw new Error(`PDF exceeds maximum page limit of ${config.processing.maxPages}`)
  }

  const document = await Document.create({
    userId: params.userId,
    fileHash,
    originalFileName: params.file.name,
    title: params.file.name.replace(/\.[^.]+$/, ""),
    sourceType,
    type: params.documentType,
    processingStatus: "processing",
    metadata: {
      pages: normalizedPageCount || 0,
      language: "en",
      processedAt: null,
      extractionMode: "queued",
      scanned: false,
      confidence: 0,
      warnings: [],
    },
  })

  const jobId = crypto.randomUUID()
  const job = await DocumentJob.create({
    jobId,
    userId: params.userId,
    documentId: document._id,
    fileHash,
    status: "processing",
    progress: 0,
    stage: "queued",
    sourceType,
  })

  await Document.findByIdAndUpdate(document._id, { jobId })

  try {
    const bufferForSend = Buffer.from(rawBuffer)
    const processorResult = await sendDocumentToProcessor({
      fileBuffer: bufferForSend,
      fileName: params.file.name,
      mimeType: params.file.type || "application/octet-stream",
      jobId,
      documentId: document._id.toString(),
      userId: params.userId,
      fileHash,
      sourceType,
      documentType: params.documentType,
      pageCount: normalizedPageCount,
    })

    return {
      duplicate: false,
      jobId: job.jobId,
      documentId: document._id.toString(),
      resultId: processorResult?.documentId || document._id.toString(),
      status: processorResult?.status || "processing",
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await Document.findByIdAndUpdate(document._id, {
      processingStatus: "failed",
      processingError: errorMessage,
    })
    await DocumentJob.findOneAndUpdate(
      { jobId, userId: params.userId },
      { status: "failed", error: errorMessage, stage: "processor-request-failed" },
    )
    throw error
  }
}