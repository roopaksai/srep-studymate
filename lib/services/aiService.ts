/**
 * AI Service - Handles all AI-related operations
 */

import { config } from "@/lib/config"
import { ExternalServiceError } from "@/lib/errors"

interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface AIResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Call OpenRouter AI API with retry logic
 */
export async function callAI(
  messages: AIMessage[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    maxRetries?: number
  }
): Promise<AIResponse> {
  const {
    model = config.ai.model,
    temperature = config.ai.temperature,
    maxTokens = config.ai.maxTokens,
    maxRetries = config.ai.maxRetries,
  } = options || {}

  const apiKey = config.ai.apiKey
  if (!apiKey) {
    throw new ExternalServiceError("AI API key not configured")
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }

      console.log(`AI call attempt ${attempt + 1}/${maxRetries}`)

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": config.api.baseUrl,
          "X-Title": config.app.name,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`AI API Error (${response.status}):`, errorText)

        // Retry on rate limit or server errors
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
          lastError = new Error(`AI API failed: ${response.status}`)
          continue
        }

        throw new ExternalServiceError(
          `AI API request failed: ${response.status} ${response.statusText}`,
          { status: response.status, error: errorText }
        )
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new ExternalServiceError("Empty response from AI")
      }

      return {
        content,
        model: data.model || model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error) {
      lastError = error as Error
      console.error(`AI call attempt ${attempt + 1} failed:`, error)

      if (attempt === maxRetries - 1) {
        throw error
      }
    }
  }

  throw lastError || new ExternalServiceError("AI call failed after all retries")
}

/**
 * Extract JSON from AI response
 */
export function extractJSON<T = any>(content: string): T | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T
    }
    return null
  } catch (error) {
    console.error("Failed to extract JSON from AI response:", error)
    return null
  }
}

/**
 * Generate questions using AI
 */
export async function generateQuestions(
  text: string,
  questionType: "mcq" | "descriptive" | "mixed",
  count: number = 10
): Promise<any[]> {
  const systemPrompts = {
    mcq: `You are an expert exam question creator. Generate EXACTLY ${count} Multiple Choice Questions (MCQ) that comprehensively cover the entire study material.

IMPORTANT: Generate ONLY MCQ questions. Do NOT generate any descriptive or other question types.

Return ONLY a valid JSON array with EXACTLY ${count} objects, each containing:
- text: the question (string)
- marks: 4 (integer - all MCQ questions are 4 marks)
- type: "mcq" (string - must be exactly "mcq")
- options: array of exactly 4 strings (different options, make them challenging and distinct)
- correctAnswer: "A" or "B" or "C" or "D" (string - must be one of these)

Make questions that test understanding, application, and analysis across all topics from the document.`,

    descriptive: `You are an expert exam question creator. Generate EXACTLY ${count} descriptive/long-answer questions that comprehensively cover the ENTIRE study material.

IMPORTANT: Generate ONLY descriptive questions. Do NOT generate any MCQ or other question types.

Return ONLY a valid JSON array with EXACTLY ${count} objects, each containing:
- text: the question (string)
- marks: 10 (integer - all questions are 10 marks)
- type: "descriptive" (string - must be exactly "descriptive")

Create questions that require detailed explanations, analysis, comparisons, and test conceptual understanding.`,

    mixed: `You are an expert exam question creator. Generate ${count} exam questions with a balanced mix of MCQ and descriptive questions.`,
  }

  const messages: AIMessage[] = [
    {
      role: "system",
      content: systemPrompts[questionType],
    },
    {
      role: "user",
      content: `Create exam questions from this material:\n\n${text.substring(0, config.text.maxContextLength)}`,
    },
  ]

  const response = await callAI(messages)
  const questions = extractJSON<any[]>(response.content)

  if (!questions || !Array.isArray(questions)) {
    throw new Error("Failed to parse questions from AI response")
  }

  return questions
}
