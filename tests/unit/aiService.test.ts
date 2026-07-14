import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { callAI, extractJSON } from "@/lib/services/aiService"
import { ExternalServiceError } from "@/lib/errors"
import { clearCache } from "@/lib/cache"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function okResponse(data: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: "hello" } }],
      model: "test-model",
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      ...data,
    }),
  }
}

function errResponse(status: number, text = "error") {
  return {
    ok: false,
    status,
    statusText: `HTTP ${status}`,
    text: async () => text,
  }
}

describe("callAI", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("makes correct API request with default model", async () => {
    mockFetch.mockResolvedValue(okResponse())

    await callAI([{ role: "user", content: "hi" }], { useCache: false })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain("/chat/completions")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body)
    expect(body.model).toBeTruthy()
    expect(body.messages).toEqual([{ role: "user", content: "hi" }])
  })

  it("uses specified feature model when feature is provided", async () => {
    mockFetch.mockResolvedValue(okResponse())

    await callAI([{ role: "user", content: "hi" }], {
      feature: "analysis",
      useCache: false,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    // The analysis model from config
    expect(body.model).toBe("openai/gpt-oss-120b:free")
  })

  it("returns parsed response with content, model, and usage", async () => {
    mockFetch.mockResolvedValue(okResponse())

    const result = await callAI([{ role: "user", content: "hi" }], {
      useCache: false,
    })

    expect(result).toHaveProperty("content")
    expect(result).toHaveProperty("model")
    expect(result).toHaveProperty("usage")
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    })
  })

  it("retries on 500 errors up to maxRetries", async () => {
    mockFetch.mockResolvedValue(errResponse(500, "server error"))

    await expect(
      callAI([{ role: "user", content: "hi" }], {
        maxRetries: 1,
        useCache: false,
      }),
    ).rejects.toThrow()

    // 4 models in chain × 1 retry each = 4 calls (no backoff with 1 attempt)
    expect(mockFetch.mock.calls.length).toBe(4)
  })

  it("retries on 429 errors by trying next model in chain", async () => {
    // All calls return 429
    mockFetch.mockResolvedValue(errResponse(429, "rate limited"))

    await expect(
      callAI([{ role: "user", content: "hi" }], {
        maxRetries: 1,
        useCache: false,
      }),
    ).rejects.toThrow()

    // 429 causes immediate break to next model, so it should have tried
    // multiple models (the full fallback chain)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it("throws when all models fail", async () => {
    mockFetch.mockResolvedValue(errResponse(500, "down"))

    await expect(
      callAI([{ role: "user", content: "hi" }], { maxRetries: 1, useCache: false }),
    ).rejects.toThrow("AI API 500")
  })

  it("throws ExternalServiceError when API key is empty", async () => {
    const { config } = await import("@/lib/config")
    const original = config.ai.apiKey
    config.ai.apiKey = ""

    await expect(
      callAI([{ role: "user", content: "hi" }]),
    ).rejects.toThrow("AI API key not configured")

    config.ai.apiKey = original
  })

  it("returns cached response on cache hit", async () => {
    const messages = [{ role: "user" as const, content: "cached?" }]

    mockFetch.mockResolvedValue(okResponse({ model: "cached-model" }))
    const first = await callAI(messages, { useCache: true })
    expect(mockFetch).toHaveBeenCalledOnce()

    // Second call should return the cached result without hitting fetch
    mockFetch.mockClear()
    const second = await callAI(messages, { useCache: true })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(second).toEqual(first)
  })

  it("caches response after successful call", async () => {
    const messages = [{ role: "user" as const, content: "cache-me" }]

    mockFetch.mockResolvedValue(okResponse())
    await callAI(messages, { useCache: true })
    expect(mockFetch).toHaveBeenCalledOnce()

    // Second call should hit cache, not fetch
    mockFetch.mockClear()
    await callAI(messages, { useCache: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("respects custom temperature and maxTokens", async () => {
    mockFetch.mockResolvedValue(okResponse())

    await callAI([{ role: "user", content: "hi" }], {
      temperature: 0.2,
      maxTokens: 500,
      useCache: false,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.temperature).toBe(0.2)
    expect(body.max_tokens).toBe(500)
  })
})

describe("extractJSON", () => {
  it("parses JSON array from text", () => {
    const input = 'Here is the result: [{"a": 1}, {"b": 2}] done'
    const result = extractJSON(input)
    expect(result).toEqual([{ a: 1 }, { b: 2 }])
  })

  it("parses JSON object from text", () => {
    const input = "Result: {\"key\": \"value\", \"num\": 42}"
    const result = extractJSON(input)
    expect(result).toEqual({ key: "value", num: 42 })
  })

  it("returns null for invalid JSON", () => {
    expect(extractJSON("no json here")).toBeNull()
    expect(extractJSON("{broken}")).toBeNull()
  })

  it("handles text with JSON embedded in markdown code block", () => {
    const input = "```json\n[{\"x\": 10}]\n```"
    const result = extractJSON(input)
    expect(result).toEqual([{ x: 10 }])
  })
})
