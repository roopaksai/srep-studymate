import crypto from "crypto"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { buildLegacyDocumentStructure } from "@/lib/documentPipeline"

async function migrateDocuments() {
  await connectDB()

  const legacyDocuments = await Document.find({
    $or: [
      { fileHash: { $exists: false } },
      { fileHash: null },
      { chunks: { $size: 0 } },
      { pages: { $size: 0 } },
    ],
  })

  let migratedCount = 0

  for (const document of legacyDocuments) {
    const legacyText = document.extractedText || ""
    const structured = buildLegacyDocumentStructure(legacyText, document.originalFileName || "legacy-document", {
      sourceType: document.sourceType || "pdf",
    })

    const legacyHash = crypto
      .createHash("sha256")
      .update(`${document._id.toString()}::${document.originalFileName || ""}::${legacyText}`)
      .digest("hex")

    document.fileHash = document.fileHash || legacyHash
    document.title = document.title || document.originalFileName?.replace(/\.[^.]+$/, "") || "Legacy Document"
    document.pages = structured.pages
    document.chunks = structured.chunks
    document.metadata = {
      ...(document.metadata || {}),
      ...structured.metadata,
      confidence: structured.metadata.confidence,
      warnings: [...(document.metadata?.warnings || []), "Migrated from legacy extractedText"],
    } as any
    document.extractedText = structured.extractedText

    await document.save()
    migratedCount += 1
  }

  console.log(`Migrated ${migratedCount} documents to the structured format.`)
}

migrateDocuments().catch((error) => {
  console.error("Document migration failed:", error)
  process.exit(1)
})