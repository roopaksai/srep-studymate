import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import { verifyToken } from "@/lib/auth"

async function extractTextFromFile(file: File): Promise<string> {
  const fileBuffer = await file.arrayBuffer()
  const fileName = file.name.toLowerCase()

  try {
    if (fileName.endsWith(".pdf")) {
      // @ts-ignore - pdf-parse-fork doesn't have type definitions
      const pdfParse = (await import("pdf-parse-fork")).default
      const buffer = Buffer.from(fileBuffer)
      const data = await pdfParse(buffer)
      console.log("PDF extraction successful, text length:", data.text?.length || 0)
      return data.text || ""
    } else if (fileName.endsWith(".docx")) {
      try {
        const mammoth = await import("mammoth")
        const buffer = Buffer.from(fileBuffer)
        const result = await mammoth.extractRawText({ buffer })
        console.log("DOCX extraction successful, text length:", result.value?.length || 0)
        return result.value || ""
      } catch (docxError) {
        console.error("DOCX parsing failed:", docxError)
        throw new Error("Failed to extract text from DOCX: " + (docxError as Error).message)
      }
    } else if (fileName.endsWith(".txt")) {
      // Decode text file properly with UTF-8
      const decoder = new TextDecoder("utf-8")
      return decoder.decode(fileBuffer)
    } else {
      // For unsupported formats, try UTF-8 decoding
      const decoder = new TextDecoder("utf-8")
      return decoder.decode(fileBuffer)
    }
  } catch (error) {
    console.error("Text extraction error:", error)
    // Last resort: try to decode as UTF-8
    try {
      const decoder = new TextDecoder("utf-8")
      return decoder.decode(fileBuffer)
    } catch {
      return ""
    }
  }
}

async function identifyTopics(text: string): Promise<string[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY not configured, returning empty topics")
      return []
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-coder:free",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at identifying key topics from study materials. Extract 3-8 main topics/concepts from the provided text. Return ONLY a JSON array of topic strings, e.g., [\"Photosynthesis\", \"Cell Division\", \"DNA Structure\"]. Keep topics concise (2-4 words each).",
          },
          {
            role: "user",
            content: `Identify main topics from this study material:\n\n${text.substring(0, 3000)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return []
    }

    // Try to parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      const topics = JSON.parse(jsonMatch[0])
      return Array.isArray(topics) ? topics.slice(0, 8) : []
    }

    // Fallback: split by lines and extract topic-like strings
    const lines = content.split("\n").filter((line: string) => line.trim())
    return lines.slice(0, 8).map((line: string) => line.replace(/^[-*•]\s*/, "").trim())
  } catch (error) {
    console.error("Topic identification error:", error)
    return []
  }
}

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

    // Extract text from PDF/DOCX/TXT
    const extractedText = await extractTextFromFile(file)

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from file. Please ensure it's a valid PDF, DOCX, or TXT file." },
        { status: 400 }
      )
    }

    // Identify topics using AI (only for study materials)
    const topics = type === "study-material" ? await identifyTopics(extractedText) : []

    const document = new Document({
      userId: payload.userId,
      originalFileName: file.name,
      extractedText: extractedText.substring(0, 5000), // Store 5000 chars (sufficient for AI processing)
      topics,
      type,
    })

    await document.save()

    return NextResponse.json(
      {
        document: {
          id: document._id,
          originalFileName: document.originalFileName,
          topics: document.topics,
          extractedText: extractedText.substring(0, 500), // Preview first 500 chars in response
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
