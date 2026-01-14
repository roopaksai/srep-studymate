import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

/**
 * Handle chunk uploads for large files (Vercel Hobby compatible)
 * POST /api/documents/upload-chunk
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

    const formData = await request.formData()
    const chunk = formData.get("chunk") as File
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    const uploadId = formData.get("uploadId") as string
    const fileName = formData.get("fileName") as string

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId || !fileName) {
      return NextResponse.json({ error: "Invalid chunk data" }, { status: 400 })
    }

    // Create temp directory for this upload
    const uploadDir = join(tmpdir(), "uploads", uploadId)
    await mkdir(uploadDir, { recursive: true })

    // Save chunk
    const chunkPath = join(uploadDir, `chunk-${chunkIndex}`)
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
    await writeFile(chunkPath, chunkBuffer)

    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} saved for upload ${uploadId}`)

    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      uploadId,
    })
  } catch (error) {
    console.error("Chunk upload error:", error)
    return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 })
  }
}
