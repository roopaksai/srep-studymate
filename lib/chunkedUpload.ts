/**
 * Chunked File Upload - For Vercel Hobby plan compatibility
 * Splits large files into 3MB chunks to bypass 4.5MB limit
 */

const CHUNK_SIZE = 3 * 1024 * 1024 // 3MB chunks (safe under 4.5MB limit)

export interface UploadProgress {
  uploadedChunks: number
  totalChunks: number
  percentage: number
}

/**
 * Upload a file in chunks
 */
export async function uploadFileInChunks(
  file: File,
  token: string,
  type: "study-material" | "answer-script",
  onProgress?: (progress: UploadProgress) => void
): Promise<{ document: any }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

  console.log(`Uploading file in ${totalChunks} chunks (${(file.size / (1024 * 1024)).toFixed(2)}MB)`)

  // Upload each chunk
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)

    const formData = new FormData()
    formData.append("chunk", chunk)
    formData.append("chunkIndex", chunkIndex.toString())
    formData.append("totalChunks", totalChunks.toString())
    formData.append("uploadId", uploadId)
    formData.append("fileName", file.name)
    formData.append("type", type)

    const response = await fetch("/api/documents/upload-chunk", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }))
      throw new Error(error.error || `Chunk ${chunkIndex + 1} upload failed`)
    }

    // Update progress
    if (onProgress) {
      onProgress({
        uploadedChunks: chunkIndex + 1,
        totalChunks,
        percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100),
      })
    }
  }

  // Finalize upload (merge chunks and process)
  const finalizeResponse = await fetch("/api/documents/finalize-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uploadId, fileName: file.name, type }),
  })

  if (!finalizeResponse.ok) {
    const error = await finalizeResponse.json().catch(() => ({ error: "Finalize failed" }))
    throw new Error(error.error || "Failed to finalize upload")
  }

  return finalizeResponse.json()
}

/**
 * Check if file should use chunked upload
 */
export function shouldUseChunkedUpload(fileSize: number): boolean {
  return fileSize > 4 * 1024 * 1024 // Use chunks for files > 4MB
}
