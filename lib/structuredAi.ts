import { callAI, extractJSON } from "@/lib/services/aiService"
import { config } from "@/lib/config"

export interface AiChunk {
  chunkId: string
  pageNumber: number
  pageNumbers?: number[]
  heading?: string
  content: string
  wordCount: number
}

export interface FlashcardItem {
  question: string
  answer: string
  chunkId?: string
}

export interface MockQuestionItem {
  text: string
  marks: number
  type: "mcq" | "descriptive" | "short-answer"
  options?: string[]
  correctAnswer?: string
  chunkId?: string
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function allocateByWeight(chunks: AiChunk[], totalCount: number): number[] {
  const weights = chunks.map((chunk) => Math.max(chunk.wordCount, 1))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const raw = weights.map((weight) => (weight / totalWeight) * totalCount)
  const base = raw.map((value) => Math.floor(value))
  let remainder = totalCount - base.reduce((sum, value) => sum + value, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction)

  for (const item of order) {
    if (remainder <= 0) break
    base[item.index] += 1
    remainder -= 1
  }

  if (base.every((value) => value === 0) && chunks.length > 0) {
    base[0] = totalCount
  }

  return base
}

function mergeFlashcards(cardsByChunk: FlashcardItem[]): FlashcardItem[] {
  const seen = new Set<string>()
  const merged: FlashcardItem[] = []

  for (const card of cardsByChunk) {
    const key = normalizeKey(card.question)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(card)
  }

  return merged
}

function mergeQuestions(questionsByChunk: MockQuestionItem[]): MockQuestionItem[] {
  const seen = new Set<string>()
  const merged: MockQuestionItem[] = []

  for (const question of questionsByChunk) {
    const key = normalizeKey(question.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(question)
  }

  return merged
}

export async function generateFlashcardsFromChunks(chunks: AiChunk[], targetCount = config.generation.flashcardTargetCount): Promise<FlashcardItem[]> {
  const allocations = allocateByWeight(chunks, targetCount)
  const results: FlashcardItem[] = []

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const count = allocations[index]
    if (!count) continue

    const response = await callAI(
      [
        {
          role: "system",
          content:
            `You are generating flashcards from one document chunk. Return ONLY valid JSON array with exactly ${count} objects. Each object must have question and answer fields. Keep the cards specific to this chunk, avoid overlap, and use deterministic phrasing.`,
        },
        {
          role: "user",
          content: `Chunk ID: ${chunk.chunkId}\nPage: ${chunk.pageNumber}\nHeading: ${chunk.heading || ""}\n\nContent:\n${chunk.content}`,
        },
      ],
      { temperature: 0, maxTokens: 1200, useCache: false },
    )

    const cards = extractJSON<Array<{ question: string; answer: string }>>(response.content) || []
    for (const card of cards.slice(0, count)) {
      if (card.question && card.answer) {
        results.push({ question: card.question.trim(), answer: card.answer.trim(), chunkId: chunk.chunkId })
      }
    }
  }

  return mergeFlashcards(results).slice(0, targetCount)
}

export async function generateQuestionsFromChunks(
  chunks: AiChunk[],
  questionType: "mcq" | "descriptive" | "mixed",
  targetCount = config.generation.mcqTargetCount,
): Promise<MockQuestionItem[]> {
  const allocations = allocateByWeight(chunks, targetCount)
  const results: MockQuestionItem[] = []

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const count = allocations[index]
    if (!count) continue

    const prompt =
      questionType === "mcq"
        ? `Generate exactly ${count} MCQ questions from this chunk. Return only valid JSON array. Each item must have text, marks=4, type="mcq", options array of 4 strings, and correctAnswer as A/B/C/D.`
        : questionType === "descriptive"
          ? `Generate exactly ${count} descriptive questions from this chunk. Return only valid JSON array. Each item must have text, marks=10, type="descriptive".`
          : `Generate exactly ${count} exam questions from this chunk with a balanced mix of mcq, short-answer, and descriptive. Return only valid JSON array. Use marks 4 for mcq, 5 for short-answer, and 10 for descriptive.`

    const response = await callAI(
      [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Chunk ID: ${chunk.chunkId}\nPage: ${chunk.pageNumber}\nHeading: ${chunk.heading || ""}\n\nContent:\n${chunk.content}`,
        },
      ],
      { temperature: 0, maxTokens: 1800, useCache: false },
    )

    const questions = extractJSON<Array<MockQuestionItem>>(response.content) || []
    for (const question of questions.slice(0, count)) {
      if (!question.text || typeof question.marks !== "number" || !question.type) continue
      if (questionType === "mcq" && (question.type !== "mcq" || !question.options || !question.correctAnswer)) continue
      if (questionType === "descriptive" && question.type !== "descriptive") continue
      results.push({ ...question, text: question.text.trim(), chunkId: chunk.chunkId })
    }
  }

  return mergeQuestions(results).slice(0, targetCount)
}