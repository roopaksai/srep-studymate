import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import { prepareDocumentContent } from "@/lib/utils"
import { buildLegacyDocumentStructure } from "@/lib/documentPipeline"
import { generateQuestionsFromChunks } from "@/lib/structuredAi"

interface Question {
  text: string
  marks: number
  type: 'mcq' | 'descriptive' | 'short-answer'
  options?: string[]
  correctAnswer?: string
}

async function generateQuestionsWithAI(
  text: string,
  questionType: 'mcq' | 'descriptive' | 'mixed'
): Promise<Question[]> {
  const apiKey = config.ai.apiKey
  if (!apiKey) {
    throw new Error(`${config.ai.provider} API key not configured`)
  }

  logger.info('AI Config', { 
    provider: config.ai.provider,
    model: config.ai.model,
    apiUrl: config.ai.apiUrl,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyStart: apiKey.substring(0, 20) + '...'
  })

  // Prepare document content adaptively based on size
  // Small docs (≤8 pages): use all, 6000 chars
  // Medium docs (8-15 pages): use all, 7000 chars  
  // Large docs (>15 pages): extract key sections, 8000 chars
  const preparedText = prepareDocumentContent(text)

  // Define prompts based on question type
  let systemPrompt = ""

  if (questionType === "mcq") {
    systemPrompt = `You are an expert MCQ question creator for academic exams. Your ONLY task is to generate Multiple Choice Questions based STRICTLY on the provided study material.

CRITICAL RULES:
1. Generate EXACTLY 10 MCQ questions - no more, no fewer
2. EVERY question must be directly traceable to the provided material
3. Each question tests factual knowledge and conceptual understanding
4. Create diverse, challenging options that test different aspects of knowledge
5. Do NOT create generic or common knowledge questions
6. Return ONLY valid JSON array - no other text

JSON Format (MUST be valid):
[
  {
    "text": "Question from the material only?",
    "marks": 4,
    "type": "mcq",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correctAnswer": "A"
  }
  ... 9 more questions ...
]

Guidelines for options:
- Provide exactly 4 options labeled A), B), C), D)
- One option is correct, three are plausible but incorrect
- Incorrect options should be subtle but clearly wrong
- Avoid "all of the above" or "none of the above"`
  } else if (questionType === "descriptive") {
    systemPrompt = `You are an expert descriptive question creator for academic exams. Your ONLY task is to generate long-answer questions based STRICTLY on the provided study material.

CRITICAL RULES:
1. Generate EXACTLY 10 descriptive/long-answer questions - no more, no fewer
2. EVERY question must be directly traceable to concepts in the provided material
3. Questions should require detailed explanations, analysis, and synthesis
4. Each question targets different key concepts or sections from the material
5. Do NOT create generic knowledge questions outside the material
6. Return ONLY valid JSON array - no other text

JSON Format (MUST be valid):
[
  {
    "text": "Explain [concept from material] with examples and analysis",
    "marks": 10,
    "type": "descriptive"
  }
  ... 9 more questions ...
]

Question characteristics:
- Require 300-500 word answers demonstrating deep understanding
- Cover different sections/themes from the provided material
- Test analysis, synthesis, comparison, evaluation
- Each question should be answerable ONLY from the material provided
- Avoid asking for information outside the scope of the material`
  } else {
    // mixed
    systemPrompt = `You are an expert exam question creator. Generate exactly 10 exam questions mixing question types, based STRICTLY on the provided study material.

QUESTION MIX:
- 4 MCQ questions (4 marks each)
- 3 short-answer questions (5 marks each)
- 3 descriptive questions (10 marks each)

CRITICAL RULES:
1. Generate EXACTLY 10 questions in the mix above
2. EVERY question must come directly from the provided study material
3. Do NOT generate generic or common knowledge questions
4. Return ONLY valid JSON array - no other text
5. Test diverse aspects and concepts from the material

JSON Format (MUST be valid):
[
  {
    "text": "MCQ question from material?",
    "marks": 4,
    "type": "mcq",
    "options": ["A) Option", "B) Option", "C) Option", "D) Option"],
    "correctAnswer": "A"
  },
  {
    "text": "Short answer question from material",
    "marks": 5,
    "type": "short-answer"
  },
  {
    "text": "Descriptive question requiring detailed explanation from material",
    "marks": 10,
    "type": "descriptive"
  },
  ... 7 more questions following the pattern ...
]

Order: MCQ (4) → Short-answer (3) → Descriptive (3)`
  }

  // Try each model - all FREE models only (Llama 3.3 > GPT-3.5 quality)
  const models = [
    { model: 'meta-llama/llama-3.3-70b-instruct', name: 'primary' },
    { model: 'qwen/qwen3-coder:free', name: 'fallback' }
  ]

  let lastError: Error | null = null
  const maxRetries = 3

  for (const modelConfig of models) {
    logger.info(`Attempting question generation with ${modelConfig.name} model`, { model: modelConfig.model })

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000
          logger.debug('Waiting before retry', { waitTime, attempt })
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }

        logger.debug('Mock paper generation attempt', { attempt: attempt + 1, maxRetries, model: modelConfig.name })

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }

        // Add appropriate authorization header
        headers["Authorization"] = `Bearer ${apiKey}`

        const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelConfig.model,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: `STUDY MATERIAL TO CREATE QUESTIONS FROM:\n\n${preparedText}\n\n\nIMPORTANT INSTRUCTIONS:\n- Create questions ONLY about the above material\n- Do NOT create generic questions\n- Do NOT add information not in the material\n- Ensure every question is directly from this material\n- Generate the exact format specified in system prompt\n- Start response with [ and end with ]\n- Return ONLY JSON, no explanations`,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error('AI API error', { status: response.status, statusText: response.statusText, model: modelConfig.name })
          lastError = new Error(`AI API failed: ${response.status}`)

          // Retry on rate limit or server errors
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
            logger.info('Rate limited or server error, retrying', { status: response.status, attempt })
            continue
          }
          throw lastError
        }

        // Success! Parse and return
        const data = await response.json()
        const content = data.choices[0]?.message?.content

        if (!content) {
          throw new Error("Empty response from AI")
        }

        // Try to parse JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]) as Question[]
          // Filter to ensure only the requested type and valid questions
          const filtered = questions.filter((q) => {
            if (!q.text || typeof q.marks !== 'number' || !q.type) return false

            // Ensure type matches what was requested
            if (questionType === 'mcq' && q.type !== 'mcq') return false
            if (questionType === 'descriptive' && q.type !== 'descriptive') return false

            // For MCQ, ensure it has options and correctAnswer
            if (questionType === 'mcq' && (!q.options || !q.correctAnswer)) return false

            return true
          })

          // Take only the first 10 questions of the correct type
          const finalQuestions = filtered.slice(0, 10)

          if (finalQuestions.length >= 10) {
            logger.info('Successfully generated questions', { count: finalQuestions.length, type: questionType, model: modelConfig.name })
            return finalQuestions
          }

          // If we didn't get enough questions, retry with this model
          throw new Error(`Only got ${finalQuestions.length} valid questions, need 10`)
        }

        throw new Error("Failed to parse AI response - no JSON array found")
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn('Generation attempt failed', { attempt: attempt + 1, model: modelConfig.name, error: lastError.message })

        // If this was the last attempt with this model, try next model
        if (attempt === maxRetries - 1) {
          logger.info(`${modelConfig.name} model failed after ${maxRetries} attempts, trying next model`)
          break // Break out of retry loop, try next model
        }
      }
    }
  }

  // All models failed
  logger.error('All models failed to generate questions', { type: questionType, error: lastError?.message })
  throw lastError || new Error("All models failed to generate questions")
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
    const { documentId, title, questionType = "mixed", reattempt = false } = await request.json()

    // Validate question type
    if (!["mcq", "descriptive", "mixed"].includes(questionType)) {
      return NextResponse.json(
        { error: "Invalid questionType. Must be 'mcq', 'descriptive', or 'mixed'" },
        { status: 400 }
      )
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: payload.userId,
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.processingStatus !== "completed") {
      return NextResponse.json(
        { error: "Document is still processing", processingStatus: document.processingStatus },
        { status: 409 },
      )
    }

    // Check if a paper of this type already exists for this document (unless reattempt)
    if (!reattempt) {
      const existingPaper = await MockPaper.findOne({
        userId: payload.userId,
        documentId,
        paperType: questionType,
      }).sort({ createdAt: -1 })

      if (existingPaper) {
        logger.info('Found existing paper', { questionType, documentId, userId: payload.userId })
        return NextResponse.json(
          {
            mockPaper: {
              id: existingPaper._id,
              documentId: existingPaper.documentId,
              title: existingPaper.title,
              paperType: existingPaper.paperType,
              questions: existingPaper.questions,
              totalMarks: existingPaper.questions.reduce(
                (sum: number, q: { marks: number }) => sum + (q.marks || 0),
                0,
              ),
              createdAt: existingPaper.createdAt,
            },
            isExisting: true, // Flag to indicate this is an existing paper
          },
          { status: 200 },
        )
      }
    } else {
      logger.info('Reattempt requested, generating new paper', { questionType, documentId, userId: payload.userId })
      // Delete old paper of this type if reattempt is true
      await MockPaper.deleteMany({
        userId: payload.userId,
        documentId,
        paperType: questionType,
      })
    }

    const structuredChunks = document.chunks?.length
      ? document.chunks
      : buildLegacyDocumentStructure(document.extractedText || "", document.originalFileName).chunks

    const questions = await generateQuestionsFromChunks(structuredChunks, questionType as 'mcq' | 'descriptive' | 'mixed')

    // Generate title: "doc name_type_mock paper" (strip file extension from originalFileName)
    const docNameWithoutExt = document.originalFileName.replace(/\.(pdf|docx|doc|txt)$/i, '')
    const paperTitle = `${docNameWithoutExt} ${questionType} Paper`

    const mockPaper = new MockPaper({
      userId: payload.userId,
      documentId,
      title: paperTitle,
      paperType: questionType,
      questions,
    })

    await mockPaper.save()

    return NextResponse.json(
      {
        mockPaper: {
          id: mockPaper._id,
          documentId: mockPaper.documentId,
          title: mockPaper.title,
          paperType: mockPaper.paperType,
          questions: mockPaper.questions,
          totalMarks: mockPaper.questions.reduce(
            (sum: number, q: { text: string; marks: number }) => sum + (q.marks || 0),
            0,
          ),
          createdAt: mockPaper.createdAt,
        },
        isExisting: false, // This is a newly generated paper
      },
      { status: 201 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Generate mock paper error', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined })
    
    // Return more specific error message
    return NextResponse.json(
      { 
        error: "Failed to generate questions from document",
        details: errorMessage,
        suggestion: "Please try again or reattempt the generation"
      }, 
      { status: 500 }
    )
  }
}
