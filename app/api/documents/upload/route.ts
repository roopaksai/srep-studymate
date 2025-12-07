import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"

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

    await connectDB()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = (formData.get("type") as string) || "study-material"

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const fileText = await file.text()

    const document = new Document({
      userId: payload.userId,
      originalFileName: file.name,
      extractedText: fileText.substring(0, 5000),
      type,
    })

    await document.save()

    return NextResponse.json(
      {
        document: {
          id: document._id,
          originalFileName: document.originalFileName,
          type: document.type,
          createdAt: document.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
