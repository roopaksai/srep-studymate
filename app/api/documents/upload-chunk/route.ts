import { type NextRequest, NextResponse } from "next/server"
import { secureRoute, addSecurityHeaders } from "@/lib/security"
import { rateLimitConfigs } from "@/lib/rateLimit"
import { writeFile, mkdir } from "fs/promises"
import { logger } from "@/lib/logger"
import { join } from "path"
import { tmpdir } from "os"

/**
 * Handle chunk uploads for large files (Vercel Hobby compatible)
 * POST /api/documents/upload-chunk
 */
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with chunk upload rate limiting
    const security = await secureRoute(request, {
      requireAuth: true,
      rateLimit: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 chunks per hour
      allowedMethods: ['POST'],
    })
    
    if (security.error) return addSecurityHeaders(security.error)
    if (!security.userId) {
      return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
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

    logger.info(`Chunk ${chunkIndex + 1}/${totalChunks} saved for upload ${uploadId}`)

    return addSecurityHeaders(NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      uploadId,
    }))
  } catch (error) {
    logger.error("Chunk upload error", { error: error instanceof Error ? error.message : String(error) })
    return addSecurityHeaders(NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 }))
  }
}
