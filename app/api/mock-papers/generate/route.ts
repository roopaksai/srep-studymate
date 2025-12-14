import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Document from "@/lib/models/Document"
import MockPaper from "@/lib/models/MockPaper"
import { verifyToken } from "@/lib/auth"

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
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured")
    }

    // Define prompts based on question type
    let systemPrompt = ""
    let questionCount = 10

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
          console.log(`Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        console.log(`Generation attempt ${attempt + 1}/${maxRetries}`)
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
                content: `Create exam questions from this material:\n\n${text.substring(0, 3500)}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error (${response.status}):`, errorText)
          lastError = new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`)
          
          // Retry on rate limit or server errors
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
            console.log(`Rate limited or server error, retrying...`)
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
            console.log(`Successfully generated ${finalQuestions.length} questions`)
            return finalQuestions
          }
          
          // If we didn't get enough questions, retry
          throw new Error(`Only got ${finalQuestions.length} valid questions, need 10`)
        }

        throw new Error("Failed to parse AI response - no JSON array found")
        
      } catch (error) {
        lastError = error
        console.error(`Attempt ${attempt + 1} failed:`, error)
        
        // If this was the last attempt, throw
        if (attempt === maxRetries - 1) {
          throw error
        }
      }
    }
    
    // This shouldn't be reached, but just in case
    throw new Error("All retry attempts failed")
  } catch (error) {
    console.error("AI generation failed, using fallback:", error)
    
    // Fallback questions based on type
    if (questionType === "mcq") {
      return [
        {
          text: "What is the primary concept discussed in the material?",
          marks: 4,
          type: "mcq",
          options: ["Basic fundamentals", "Advanced applications", "Historical context", "Future implications"],
          correctAnswer: "A",
        },
        {
          text: "Which of the following best describes the methodology?",
          marks: 4,
          type: "mcq",
          options: ["Theoretical", "Practical", "Mixed approach", "Case-based"],
          correctAnswer: "C",
        },
        {
          text: "What is the main objective of the discussed approach?",
          marks: 4,
          type: "mcq",
          options: ["Efficiency", "Accuracy", "Simplicity", "Scalability"],
          correctAnswer: "B",
        },
      ]
    } else if (questionType === "descriptive") {
      return [
        {
          text: "Explain the main concepts covered in the study material in detail.",
          marks: 10,
          type: "descriptive",
        },
        {
          text: "Analyze the relationships between different topics discussed and their practical implications.",
          marks: 12,
          type: "descriptive",
        },
        {
          text: "Compare and contrast the key methodologies presented in the material.",
          marks: 15,
          type: "descriptive",
        },
      ]
    } else {
      // mixed fallback
      return [
        {
          text: "What is the primary concept discussed in the material?",
          marks: 4,
          type: "mcq",
          options: ["Basic fundamentals", "Advanced applications", "Historical context", "Future implications"],
          correctAnswer: "A",
        },
        {
          text: "Explain the main concepts covered in the study material.",
          marks: 10,
          type: "descriptive",
        },
        {
          text: "Define the important terms mentioned in the text.",
          marks: 5,
          type: "short-answer",
        },
      ]
    }
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
        console.log(`Found existing ${questionType} paper, returning it instead of generating new one`)
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
      console.log(`Reattempt requested, generating new ${questionType} paper`)
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
    console.error("Generate mock paper error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
