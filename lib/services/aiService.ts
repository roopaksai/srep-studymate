/**
 * AI Service - Handles all AI operations with fallback chains and caching
 */

import { config } from "@/lib/config"
import { ExternalServiceError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { getCached, setCache, generateAICacheKey, cacheTTL } from "@/lib/cache"

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

export type AIFeature = keyof typeof config.ai.models

/**
 * Resolve the best model for a feature, with fallback chain
 */
function resolveModelChain(feature?: AIFeature): string[] {
  const primary = (feature
    ? config.ai.models[feature]
    : config.ai.models.default) as string

  // Build chain: primary model first, then fallbacks (skip duplicates)
  const chain = [primary, ...config.ai.models.fallbackChain.filter(m => m !== primary)]
  return chain
}

/**
 * Call AI with retry logic, model fallback chain, and caching
 */
export async function callAI(
  messages: AIMessage[],
  options?: {
    model?: string
    feature?: AIFeature
    temperature?: number
    maxTokens?: number
    maxRetries?: number
    useCache?: boolean
  }
): Promise<AIResponse> {
  const {
    model: explicitModel,
    feature,
    temperature = config.ai.temperature,
    maxTokens = config.ai.maxTokens,
    maxRetries = config.ai.maxRetries,
    useCache = true,
  } = options || {}

  const apiKey = config.ai.apiKey
  if (!apiKey) {
    throw new ExternalServiceError("AI API key not configured")
  }

  // Determine model chain
  const modelChain = explicitModel
    ? [explicitModel, ...config.ai.models.fallbackChain.filter(m => m !== explicitModel)]
    : resolveModelChain(feature)

  // Check cache first (only for primary model)
  if (useCache) {
    const cacheKey = generateAICacheKey(
      feature || 'ai-call',
      JSON.stringify(messages.slice(0, 2)),
      { model: modelChain[0], temperature }
    )
    const cached = getCached<AIResponse>(cacheKey)
    if (cached) {
      logger.debug('AI response cache hit', { feature, model: cached.model })
      return cached
    }
  }

  let lastError: Error | null = null
  const startTime = Date.now()

  // Try each model in the fallback chain
  for (const currentModel of modelChain) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const waitTime = Math.pow(2, attempt) * 1000
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        logger.debug('AI call attempt', {
          feature,
          model: currentModel,
          attempt: attempt + 1,
          maxRetries,
        })

        const response = await fetch(`${config.ai.apiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": config.api.baseUrl,
            "X-Title": config.app.name,
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const status = response.status

          // Rate limit or server error — retry this model, then try next model
          if (status === 429 || status >= 500) {
            lastError = new Error(`AI API ${status}: ${errorText.substring(0, 200)}`)
            logger.warn('AI rate limit / server error', {
              feature,
              model: currentModel,
              status,
              attempt: attempt + 1,
            })

            // On 429, immediately try next model (don't waste retries on rate-limited model)
            if (status === 429) break

            continue
          }

          // Client error (400, 401, etc.) — don't retry, try next model
          lastError = new Error(`AI API ${status}: ${errorText.substring(0, 200)}`)
          logger.warn('AI client error, trying next model', {
            feature,
            model: currentModel,
            status,
          })
          break
        }

        const data = await response.json()
        const content = data.choices[0]?.message?.content

        if (!content) {
          lastError = new Error("Empty response from AI")
          continue
        }

        const result: AIResponse = {
          content,
          model: data.model || currentModel,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        }

        // Cache the response
        if (useCache) {
          const cacheKey = generateAICacheKey(
            feature || 'ai-call',
            JSON.stringify(messages.slice(0, 2)),
            { model: currentModel, temperature }
          )
          setCache(cacheKey, result, cacheTTL.aiGeneration)
        }

        const duration = Date.now() - startTime
        logger.aiOperation('AI call', currentModel, duration, result.usage?.totalTokens)

        return result
      } catch (error) {
        lastError = error as Error
        logger.error('AI call attempt failed', {
          feature,
          model: currentModel,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        })

        if (attempt === maxRetries - 1) {
          break // Try next model
        }
      }
    }
  }

  const duration = Date.now() - startTime
  logger.error('All AI models failed', {
    feature,
    models: modelChain,
    duration,
    error: lastError?.message,
  })

  throw lastError || new ExternalServiceError("AI service unavailable — all models failed")
}

/**
 * Extract JSON from AI response
 */
export function extractJSON<T = any>(content: string): T | null {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T
    }
    return null
  } catch {
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

  const response = await callAI(messages, { feature: 'mockQuestions' })
  const questions = extractJSON<any[]>(response.content)

  if (!questions || !Array.isArray(questions)) {
    throw new Error("Failed to parse questions from AI response")
  }

  return questions
}
