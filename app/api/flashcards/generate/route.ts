import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import FlashcardSet from "@/lib/models/FlashcardSet"
import { verifyToken } from "@/lib/auth"

async function generateFlashcardsWithAI(text: string): Promise<{ question: string; answer: string }[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    const systemPrompt = "You are an expert educator creating flashcards. Generate 10-12 high-quality flashcards from the provided study material. Cover all important concepts, definitions, and key facts. Return ONLY a JSON array with objects containing 'question' and 'answer' fields. Make questions clear and concise, and answers detailed but focused."

    const userPrompt = `Create flashcards from this study material:\n\n${text.substring(0, 3500)}`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "SREP StudyMate",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const cards = JSON.parse(jsonMatch[0])
      return cards.filter((card: any) => card.question && card.answer)
    }

    throw new Error("Failed to parse AI response")
  } catch (error) {
    console.error("AI generation failed, using fallback:", error)
    // Fallback to simple extraction
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20).slice(0, 8)
    return sentences.map((sentence, index) => ({
      question: `What is the key concept ${index + 1} from the material?`,
      answer: sentence.trim(),
    }))
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
    const { documentId, reattempt = false } = await request.json()

    const document = await Document.findOne({
      _id: documentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if flashcards already exist for this document (unless reattempt)
    if (!reattempt) {
      const existingFlashcardSet = await FlashcardSet.findOne({
        userId: payload.userId,
        documentId,
      }).sort({ createdAt: -1 })

      if (existingFlashcardSet) {
        console.log(`Found existing flashcard set, returning it instead of generating new one`)
        return NextResponse.json(
          {
            flashcardSet: {
              id: existingFlashcardSet._id,
              documentId: existingFlashcardSet.documentId.toString(),
              title: existingFlashcardSet.title,
              cards: existingFlashcardSet.cards,
              createdAt: existingFlashcardSet.createdAt,
            },
            isExisting: true, // Flag to indicate this is an existing set
          },
          { status: 200 },
        )
      }
    } else {
      console.log(`Reattempt requested, generating new flashcard set`)
      // Delete old flashcard set if reattempt is true
      await FlashcardSet.deleteMany({
        userId: payload.userId,
        documentId,
      })
    }

    // Generate flashcards
    const cards = await generateFlashcardsWithAI(document.extractedText)

    // Generate title: "doc name Flashcards" (strip file extension from originalFileName)
    const docNameWithoutExt = document.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')
    const flashcardTitle = `${docNameWithoutExt} Flashcards`

    const flashcardSet = new FlashcardSet({
      userId: payload.userId,
      documentId,
      title: flashcardTitle,
      cards,
    })

    await flashcardSet.save()

    return NextResponse.json(
      {
        flashcardSet: {
          id: flashcardSet._id,
          documentId: flashcardSet.documentId.toString(),
          title: flashcardSet.title,
          cards: flashcardSet.cards,
          createdAt: flashcardSet.createdAt,
        },
        isExisting: false, // This is a newly generated set
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate flashcards error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
