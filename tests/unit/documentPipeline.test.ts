import { describe, it, expect, vi } from "vitest"
import {
  combineChunksToText,
  buildLegacyDocumentStructure,
  createStructuredDocumentFromText,
  createStructuredDocumentFromExtraction,
  createStructuredDocumentFromPages,
  countWords,
  hashBuffer,
  chunkStructuredPages,
} from "@/lib/documentPipeline"

describe("combineChunksToText", () => {
  it("joins chunk content with newlines", () => {
    const chunks = [
      { content: "first" },
      { content: "second" },
      { content: "third" },
    ]
    expect(combineChunksToText(chunks)).toBe("first\n\nsecond\n\nthird")
  })

  it("returns empty string for empty array", () => {
    expect(combineChunksToText([])).toBe("")
  })

  it("handles single chunk", () => {
    expect(combineChunksToText([{ content: "only" }])).toBe("only")
  })
})

describe("buildLegacyDocumentStructure", () => {
  it("creates pages from text", () => {
    const doc = buildLegacyDocumentStructure("Hello world", "test.txt")
    expect(doc.pages.length).toBeGreaterThanOrEqual(1)
    expect(doc.pages[0].pageNumber).toBe(1)
    expect(doc.pages[0].sections.length).toBeGreaterThanOrEqual(1)
  })

  it("handles empty text", () => {
    const doc = buildLegacyDocumentStructure("", "empty.txt")
    expect(doc.pages.length).toBeGreaterThanOrEqual(1)
    expect(doc.title).toBe("empty.txt")
  })

  it("creates chunks from text", () => {
    const doc = buildLegacyDocumentStructure("Some content here", "doc.txt")
    expect(doc.chunks.length).toBeGreaterThanOrEqual(1)
    expect(doc.chunks[0].chunkId).toBeTruthy()
    expect(doc.chunks[0].wordCount).toBeGreaterThanOrEqual(1)
  })

  it("includes metadata (title, sourceType, extractedText)", () => {
    const doc = buildLegacyDocumentStructure("content", "myfile.pdf", {
      sourceType: "pdf-upload",
    })
    expect(doc.title).toBe("myfile.pdf")
    expect(doc.metadata.extractionMode).toBe("pdf-upload")
    expect(doc.extractedText).toBeTruthy()
  })

  it("preserves file extension in metadata via title", () => {
    const doc = buildLegacyDocumentStructure("data", "chapter1.docx")
    expect(doc.title).toBe("chapter1.docx")
  })
})

describe("createStructuredDocumentFromText", () => {
  it("creates structured document with pages and chunks", () => {
    const doc = createStructuredDocumentFromText(
      "First paragraph\n\nSecond paragraph",
      "My Doc",
    )
    expect(doc.title).toBe("My Doc")
    expect(doc.pages.length).toBeGreaterThanOrEqual(1)
    expect(doc.chunks.length).toBeGreaterThanOrEqual(1)
    expect(doc.extractedText).toBeTruthy()
  })

  it("respects custom options", () => {
    const doc = createStructuredDocumentFromText("text", "doc", {
      pages: 5,
      extractionMode: "custom",
      scanned: true,
      confidence: 0.6,
      warnings: ["warn1"],
    })
    expect(doc.metadata.pages).toBe(5)
    expect(doc.metadata.extractionMode).toBe("custom")
    expect(doc.metadata.scanned).toBe(true)
    expect(doc.metadata.confidence).toBe(0.6)
    expect(doc.metadata.warnings).toEqual(["warn1"])
  })

  it("splits on form-feed characters into separate pages", () => {
    const text = "Page one content\x0CPage two content"
    const doc = createStructuredDocumentFromText(text, "split")
    expect(doc.pages.length).toBe(2)
    expect(doc.pages[0].pageNumber).toBe(1)
    expect(doc.pages[1].pageNumber).toBe(2)
  })
})

describe("createStructuredDocumentFromPages", () => {
  it("creates structured document from legacy page data", () => {
    const pages = [
      { pageNumber: 1, text: "Line one\nLine two" },
      { pageNumber: 2, text: "Line three" },
    ]
    const doc = createStructuredDocumentFromPages(pages, "Legacy Doc")

    expect(doc.title).toBe("Legacy Doc")
    expect(doc.pages.length).toBe(2)
    expect(doc.chunks.length).toBe(2)
    expect(doc.chunks[0].chunkId).toBe("chunk-1")
    expect(doc.chunks[0].pageNumbers).toEqual([1])
  })

  it("handles pages with empty text", () => {
    const pages = [{ pageNumber: 1, text: "" }]
    const doc = createStructuredDocumentFromPages(pages, "Empty")
    expect(doc.pages.length).toBe(1)
    expect(doc.pages[0].sections.length).toBeGreaterThanOrEqual(1)
  })
})

describe("createStructuredDocumentFromExtraction", () => {
  it("converts extraction result to structured document", () => {
    const extractionResult = {
      title: "Extracted PDF",
      fullMarkdown: "markdown",
      tocMarkdown: "",
      pages: [
        {
          pageNumber: 1,
          markdown: "Page markdown",
          blocks: [
            { type: "heading" as const, content: "Chapter 1" },
            { type: "paragraph" as const, content: "Some paragraph text" },
          ],
          tables: [],
          isScanned: false,
          warnings: [],
        },
      ],
      chunks: [
        {
          chunkId: "c1",
          pageNumber: 1,
          pageNumbers: [1],
          heading: "Chapter 1",
          content: "Some paragraph text",
          wordCount: 4,
        },
      ],
      extractedText: "Some paragraph text",
      metadata: {
        pageCount: 1,
        scannedPages: 0,
        totalChars: 100,
        warnings: [],
        extractionTimeMs: 50,
      },
    }

    const doc = createStructuredDocumentFromExtraction(extractionResult, "Fallback Title")

    expect(doc.title).toBe("Extracted PDF")
    expect(doc.pages.length).toBe(1)
    expect(doc.pages[0].sections).toEqual([
      { heading: "Chapter 1", content: ["Some paragraph text"] },
    ])
    expect(doc.chunks.length).toBe(1)
    expect(doc.chunks[0].chunkId).toBe("c1")
    expect(doc.metadata.extractionMode).toBe("pdf-extraction-v2")
    expect(doc.metadata.scanned).toBe(false)
    expect(doc.metadata.confidence).toBe(0.95)
    expect(doc.extractedText).toBe("Some paragraph text")
  })

  it("uses fallback title when extraction result has no title", () => {
    const extractionResult = {
      title: "",
      fullMarkdown: "",
      tocMarkdown: "",
      pages: [],
      chunks: [],
      extractedText: "",
      metadata: {
        pageCount: 0,
        scannedPages: 0,
        totalChars: 0,
        warnings: [],
        extractionTimeMs: 0,
      },
    }

    const doc = createStructuredDocumentFromExtraction(extractionResult, "Fallback")
    expect(doc.title).toBe("Fallback")
  })

  it("marks document as scanned when scannedPages > 0", () => {
    const extractionResult = {
      title: "Scanned",
      fullMarkdown: "",
      tocMarkdown: "",
      pages: [],
      chunks: [],
      extractedText: "",
      metadata: {
        pageCount: 5,
        scannedPages: 3,
        totalChars: 0,
        warnings: ["scan warning"],
        extractionTimeMs: 100,
      },
    }

    const doc = createStructuredDocumentFromExtraction(extractionResult, "Scan")
    expect(doc.metadata.scanned).toBe(true)
    expect(doc.metadata.scannedPages).toBe(3)
    expect(doc.metadata.confidence).toBe(0.7)
    expect(doc.metadata.warnings).toEqual(["scan warning"])
  })
})

describe("countWords", () => {
  it("counts words in normal text", () => {
    expect(countWords("one two three")).toBe(3)
  })

  it("returns 0 for empty/whitespace strings", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
  })

  it("normalizes multiple spaces", () => {
    expect(countWords("  one   two  ")).toBe(2)
  })
})

describe("hashBuffer", () => {
  it("returns a sha256 hex string", () => {
    const hash = hashBuffer(Buffer.from("hello"))
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("produces different hashes for different inputs", () => {
    const a = hashBuffer(Buffer.from("aaa"))
    const b = hashBuffer(Buffer.from("bbb"))
    expect(a).not.toBe(b)
  })
})

describe("chunkStructuredPages", () => {
  it("creates one chunk per page", () => {
    const pages = [
      {
        pageNumber: 1,
        sections: [{ heading: "H1", content: ["line a", "line b"] }],
      },
      {
        pageNumber: 2,
        sections: [{ heading: "H2", content: ["line c"] }],
      },
    ]
    const chunks = chunkStructuredPages(pages)
    expect(chunks.length).toBe(2)
    expect(chunks[0].chunkId).toBe("page-1")
    expect(chunks[0].heading).toBe("H1")
    expect(chunks[0].content).toContain("line a")
    expect(chunks[0].content).toContain("line b")
    expect(chunks[1].pageNumber).toBe(2)
  })

  it("joins multiple sections with double newlines", () => {
    const pages = [
      {
        pageNumber: 1,
        sections: [
          { heading: "A", content: ["aaa"] },
          { heading: "B", content: ["bbb"] },
        ],
      },
    ]
    const chunks = chunkStructuredPages(pages)
    expect(chunks[0].content).toBe("aaa\n\nbbb")
  })
})
