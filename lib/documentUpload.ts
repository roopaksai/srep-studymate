import crypto from "crypto"

export type DocumentSourceType = "pdf" | "docx" | "doc" | "txt"

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
