import { describe, it, expect, beforeEach, vi } from "vitest"
import { getCached, setCache, deleteCache, clearCache, withCache, generateAICacheKey, getCacheStats, cacheTTL } from "@/lib/cache"

describe("cache", () => {
  beforeEach(() => {
    clearCache()
  })

  describe("getCached", () => {
    it("returns null for non-existent keys", () => {
      expect(getCached("nonexistent")).toBeNull()
    })

    it("returns null for expired entries", () => {
      setCache("expired-key", "value", -1) // already expired
      expect(getCached("expired-key")).toBeNull()
    })
  })

  describe("setCache + getCached", () => {
    it("round-trips correctly", () => {
      setCache("key1", { data: "hello" })
      expect(getCached("key1")).toEqual({ data: "hello" })
    })

    it("stores different types", () => {
      setCache("string", "hello")
      setCache("number", 42)
      setCache("array", [1, 2, 3])
      setCache("nested", { a: { b: 1 } })

      expect(getCached("string")).toBe("hello")
      expect(getCached("number")).toBe(42)
      expect(getCached("array")).toEqual([1, 2, 3])
      expect(getCached("nested")).toEqual({ a: { b: 1 } })
    })

    it("with custom TTL expires correctly", () => {
      setCache("short-lived", "data", 1) // 1ms TTL
      // Wait for expiry
      return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
        expect(getCached("short-lived")).toBeNull()
      })
    })
  })

  describe("deleteCache", () => {
    it("removes entries", () => {
      setCache("to-delete", "value")
      expect(getCached("to-delete")).toBe("value")
      deleteCache("to-delete")
      expect(getCached("to-delete")).toBeNull()
    })
  })

  describe("clearCache", () => {
    it("clears all entries", () => {
      setCache("a", 1)
      setCache("b", 2)
      setCache("c", 3)
      clearCache()
      expect(getCached("a")).toBeNull()
      expect(getCached("b")).toBeNull()
      expect(getCached("c")).toBeNull()
    })
  })

  describe("withCache", () => {
    it("calls function on cache miss", async () => {
      const fn = vi.fn().mockResolvedValue("result")
      const result = await withCache("miss-key", fn)
      expect(result).toBe("result")
      expect(fn).toHaveBeenCalledOnce()
    })

    it("returns cached value on hit without calling function", async () => {
      const fn = vi.fn().mockResolvedValue("result")
      await withCache("hit-key", fn) // populate cache
      fn.mockClear()

      const result = await withCache("hit-key", fn)
      expect(result).toBe("result")
      expect(fn).not.toHaveBeenCalled()
    })

    it("respects custom TTL", async () => {
      const fn = vi.fn().mockResolvedValue("value")
      await withCache("ttl-key", fn, 1) // 1ms TTL
      fn.mockClear()

      await new Promise((r) => setTimeout(r, 10))
      const result = await withCache("ttl-key", fn)
      expect(result).toBe("value")
      expect(fn).toHaveBeenCalledOnce()
    })
  })

  describe("generateAICacheKey", () => {
    it("produces consistent keys for same input", () => {
      const key1 = generateAICacheKey("flashcards", "hello world")
      const key2 = generateAICacheKey("flashcards", "hello world")
      expect(key1).toBe(key2)
    })

    it("produces different keys for different operations", () => {
      const key1 = generateAICacheKey("flashcards", "hello")
      const key2 = generateAICacheKey("questions", "hello")
      expect(key1).not.toBe(key2)
    })

    it("produces different keys for different content", () => {
      const key1 = generateAICacheKey("flashcards", "hello")
      const key2 = generateAICacheKey("flashcards", "world")
      expect(key1).not.toBe(key2)
    })

    it("includes params in key", () => {
      const key1 = generateAICacheKey("test", "content", { model: "a" })
      const key2 = generateAICacheKey("test", "content", { model: "b" })
      expect(key1).not.toBe(key2)
    })

    it("key starts with ai: prefix", () => {
      const key = generateAICacheKey("test", "content")
      expect(key).toMatch(/^ai:test:/)
    })
  })

  describe("getCacheStats", () => {
    it("returns accurate counts", () => {
      setCache("a", 1)
      setCache("b", 2)
      const stats = getCacheStats()
      expect(stats.active).toBeGreaterThanOrEqual(2)
      expect(stats.total).toBeGreaterThanOrEqual(2)
    })
  })
})
