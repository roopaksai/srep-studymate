import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { config } from "@/lib/config"
import { prepareTextForAI } from "@/lib/utils"

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
  try {
    const apiKey = config.ai.apiKey
    if (!apiKey) {
      throw new Error(`${config.ai.provider} API key not configured`)
    }

    // Use full text prepared for AI instead of just first 3500 chars
    const preparedText = prepareTextForAI(text, 12000)

    // Try primary model first, then fallback model
    const models = [
      { model: config.ai.model, name: 'primary' },
      { model: 'google/gemma-3-27b-it:free', name: 'fallback' }
    ]

    for (const modelConfig of models) {
      logger.info(`Attempting question generation with ${modelConfig.name} model`, { model: modelConfig.model })

    // Define prompts based on question type
    let systemPrompt = ""

    if (questionType === "mcq") {
      systemPrompt = `You are an expert exam question creator. Generate EXACTLY 10 Multiple Choice Questions (MCQ) that comprehensively cover the entire study material.

IMPORTANT: Generate ONLY MCQ questions. Do NOT generate any descriptive or other question types.

Return ONLY a valid JSON array with EXACTLY 10 objects, each containing:
- text: the question (string)
- marks: 4 (integer - all MCQ questions are 4 marks)
- type: "mcq" (string - must be exactly "mcq")
- options: array of exactly 4 strings (different options, make them challenging and distinct)
- correctAnswer: "A" or "B" or "C" or "D" (string - must be one of these)

Example format:
[
  {
    "text": "What is the primary concept?",
    "marks": 4,
    "type": "mcq",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": "A"
  }
]

Make questions that test understanding, application, and analysis across all topics from the document. Ensure options are clear, unambiguous, and test different concepts.`
      questionCount = 10
    } else if (questionType === "descriptive") {
      systemPrompt = `You are an expert exam question creator. Generate EXACTLY 10 descriptive/long-answer questions that comprehensively cover the ENTIRE study material.

IMPORTANT: Generate ONLY descriptive questions. Do NOT generate any MCQ or other question types.

Return ONLY a valid JSON array with EXACTLY 10 objects, each containing:
- text: the question (string)
- marks: 10 (integer - all questions are 10 marks)
- type: "descriptive" (string - must be exactly "descriptive")

Example format:
[
  {
    "text": "Explain the main concept in detail.",
    "marks": 10,
    "type": "descriptive"
  }
]

Create questions that:
- Cover different sections/topics from the entire document
- Require detailed explanations, analysis, comparisons
- Test conceptual understanding, application, and critical thinking
- Are balanced across the material (don't focus on just one area)

Ensure all 10 questions together cover the complete study material.`
      questionCount = 10
    } else {
      // mixed
      systemPrompt = `You are an expert exam question creator. Generate 10 exam questions from the study material with a balanced mix:
- 4-5 MCQ questions (4 marks each, provide 4 options and correctAnswer as "A", "B", "C", or "D")
- 2-3 short-answer questions (5 marks each)
- 2-3 descriptive/long-answer questions (10 marks each)

Return ONLY a JSON array with objects containing:
- text: the question
- marks: integer (4 for MCQ, 5 for short-answer, 10 for descriptive)
- type: "mcq", "short-answer", or "descriptive"
- options: array of 4 strings (only for MCQ)
- correctAnswer: "A", "B", "C", or "D" (only for MCQ)

Ensure questions test understanding, application, and analysis.`
    }

    // Use the working model with retry logic
    let lastError = null
    const maxRetries = 3
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000
          logger.debug('Waiting before retry', { waitTime, attempt })
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        logger.debug('Mock paper generation attempt', { attempt: attempt + 1, maxRetries })
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }

        // Add appropriate authorization header based on provider
        if (config.ai.provider === "openai") {
          headers["Authorization"] = `Bearer ${apiKey}`
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`
        }

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
                content: `Create exam questions from this material:\n\n${preparedText}\n\nREMEMBER: Generate questions ONLY from the above material. Do NOT generate generic questions.`,
              },
            ],
            temperature: 0.3, // Lower temperature for more consistent output
            max_tokens: 2000,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error('AI API error', { status: response.status, statusText: response.statusText, errorText })
          lastError = new Error(`AI API failed: ${response.status} ${response.statusText}`)
          
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
        lastError = error
        logger.warn('Generation attempt failed', { attempt: attempt + 1, model: modelConfig.name, error: error instanceof Error ? error.message : String(error) })
        
        // If this was the last attempt with this model, try next model
        if (attempt === maxRetries - 1) {
          logger.info(`${modelConfig.name} model failed after ${maxRetries} attempts, trying next model`, { model: modelConfig.model })
          break // Break out of retry loop, try next model
        }
      }
    }
    } catch (error) {
    logger.error('AI generation failed completely', { error: error instanceof Error ? error.message : String(error), type: questionType })
    
    // Throw error to be handled by POST handler
    throw error
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

    const questions = await generateQuestionsWithAI(document.extractedText, questionType as 'mcq' | 'descriptive' | 'mixed')

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
