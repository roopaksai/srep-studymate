import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import FlashcardSet from "@/lib/models/FlashcardSet"
import { verifyToken } from "@/lib/auth"

function generateSampleFlashcards(text: string) {
  const sentences = text
    .split(".")
    .filter((s) => s.trim().length > 0)
    .slice(0, 5)
  const cards = sentences.map((sentence, index) => ({
    question: `What is concept ${index + 1}?`,
    answer: sentence.trim() + ".",
  }))
  return cards.length > 0
    ? cards
    : [
        { question: "What is this document about?", answer: "This document covers important study material." },
        {
          question: "What are the key topics?",
          answer: "The document covers multiple key topics for exam preparation.",
        },
      ]
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
    const { documentId, title } = await request.json()

    const document = await Document.findOne({
      _id: documentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const cards = generateSampleFlashcards(document.extractedText)

    const flashcardSet = new FlashcardSet({
      userId: payload.userId,
      documentId,
      title: title || "Flashcard Set",
      cards,
    })

    await flashcardSet.save()

    return NextResponse.json(
      {
        flashcardSet: {
          id: flashcardSet._id,
          title: flashcardSet.title,
          cards: flashcardSet.cards,
          createdAt: flashcardSet.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate flashcards error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
