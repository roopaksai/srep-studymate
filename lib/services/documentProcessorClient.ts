import { config } from "@/lib/config"

interface ProcessDocumentParams {
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  jobId: string
  documentId: string
  userId: string
  fileHash: string
  sourceType: "pdf" | "docx" | "doc" | "txt"
  documentType: "study-material" | "answer-script"
  pageCount?: number | null
}

export async function sendDocumentToProcessor(params: ProcessDocumentParams) {
  const formData = new FormData()
  formData.append("file", new Blob([params.fileBuffer], { type: params.mimeType }), params.fileName)

  const response = await fetch(`${config.processing.serviceUrl}/process-pdf`, {
    method: "POST",
    headers: {
      "X-Service-Token": config.processing.serviceToken,
      "X-Job-Id": params.jobId,
      "X-Document-Id": params.documentId,
      "X-User-Id": params.userId,
      "X-File-Hash": params.fileHash,
      "X-Source-Type": params.sourceType,
      "X-Document-Type": params.documentType,
      ...(params.pageCount ? { "X-Page-Count": String(params.pageCount) } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Processor request failed (${response.status}): ${errorText || response.statusText}`)
  }

  return response.json()
}