import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { verifyToken } from "@/lib/auth"
import DocumentJob from "@/lib/models/DocumentJob"
import Document from "@/lib/models/Document"

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()

    const job = await DocumentJob.findOne({ jobId, userId: payload.userId }).lean()
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const document = await Document.findOne({ _id: job.documentId, userId: payload.userId })

    return NextResponse.json({
      job: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        error: job.error,
        resultId: job.resultId,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
      document: document
        ? {
            id: document._id,
            originalFileName: document.originalFileName,
            type: document.type,
            processingStatus: document.processingStatus,
            processingError: document.processingError,
            title: document.title,
            metadata: document.metadata,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}