import crypto from "crypto"
import { cleanAndOptimizeText } from "@/lib/utils"
import type { ExtractionResult, PageResult } from "@/lib/pdfExtractor"

export interface StructuredSection {
  heading: string
  content: string[]
}

export interface StructuredPage {
  pageNumber: number
  sections: StructuredSection[]
}

export interface StructuredChunk {
  chunkId: string
  pageNumber: number
  pageNumbers: number[]
  heading: string
  content: string
  wordCount: number
}

export interface StructuredDocument {
  title: string
  pages: StructuredPage[]
  chunks: StructuredChunk[]
  metadata: {
    pages: number
    language: string
    processedAt: string
    extractionMode: string
    scanned: boolean
    scannedPages?: number
    confidence: number
    warnings: string[]
    totalChars?: number
    extractionTimeMs?: number
  }
  extractedText: string
}

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

export function countWords(text: string): number {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return 0
  return normalized.split(" ").length
}

function normalizeContentLines(content: string | string[]): string[] {
  if (Array.isArray(content)) {
    return content.map((line) => line.trim()).filter(Boolean)
  }

  return cleanAndOptimizeText(content)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getHeadingFromText(text: string, fallback: string): string {
  const trimmed = text.trim()
  if (!trimmed) return fallback
  if (/^#{1,6}\s+/.test(trimmed)) {
    return trimmed.replace(/^#{1,6}\s+/, "").trim()
  }
  return trimmed.length > 120 ? fallback : trimmed
}

// ---------------------------------------------------------------------------
// Primary: Build StructuredDocument from ExtractionResult (new pipeline)
// ---------------------------------------------------------------------------

/**
 * Convert a PageResult from the new extraction pipeline into StructuredPage format.
 * Preserves headings, lists, tables, and code blocks as structured sections.
 */
function pageResultToStructuredPage(page: PageResult): StructuredPage {
  const sections: StructuredSection[] = []
  let currentHeading = `Page ${page.pageNumber}`
  let currentContent: string[] = []

  for (const block of page.blocks) {
    if (block.type === "heading") {
      // Save previous section if it has content
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent })
      }
      currentHeading = block.content
      currentContent = []
    } else {
      // Paragraphs, lists, code, separators all go into content
      if (block.content) {
        currentContent.push(block.content)
      }
    }
  }

  // Push final section
  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent })
  }

  // Ensure at least one section
  if (sections.length === 0) {
    sections.push({
      heading: `Page ${page.pageNumber}`,
      content: [page.markdown || ""],
    })
  }

  return { pageNumber: page.pageNumber, sections }
}

/**
 * Build a StructuredDocument directly from the new extraction pipeline's ExtractionResult.
 * This is the primary path for PDF extraction.
 */
export function createStructuredDocumentFromExtraction(
  result: ExtractionResult,
  title: string,
): StructuredDocument {
  const pages: StructuredPage[] = result.pages.map(pageResultToStructuredPage)

  // Use the chunks from the extraction pipeline (already optimally sized)
  const chunks: StructuredChunk[] = result.chunks.map((c) => ({
    chunkId: c.chunkId,
    pageNumber: c.pageNumber,
    pageNumbers: c.pageNumbers,
    heading: c.heading,
    content: c.content,
    wordCount: c.wordCount,
  }))

  return {
    title: result.title || title,
    pages,
    chunks,
    extractedText: result.extractedText,
    metadata: {
      pages: result.metadata.pageCount,
      language: "en",
      processedAt: new Date().toISOString(),
      extractionMode: "pdf-extraction-v2",
      scanned: result.metadata.scannedPages > 0,
      scannedPages: result.metadata.scannedPages,
      confidence: result.metadata.scannedPages > 0 ? 0.7 : 0.95,
      warnings: result.metadata.warnings,
      totalChars: result.metadata.totalChars,
      extractionTimeMs: result.metadata.extractionTimeMs,
    },
  }
}

// ---------------------------------------------------------------------------
// Legacy: Text-based extraction (for DOCX, TXT, and fallback)
// ---------------------------------------------------------------------------

export function createStructuredDocumentFromText(
  text: string,
  title: string,
  options?: {
    pages?: number
    extractionMode?: string
    scanned?: boolean
    confidence?: number
    warnings?: string[]
  },
): StructuredDocument {
  const normalized = cleanAndOptimizeText(text)
  const pageBlocks = normalized
    .split(/\f|\n{3,}/g)
    .map((page) => page.trim())
    .filter(Boolean)

  const pages: StructuredPage[] = (pageBlocks.length > 0 ? pageBlocks : [normalized || ""])
    .map((pageText, index) => {
      const lines = pageText.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      const sections: StructuredSection[] = []

      if (lines.length === 0) {
        sections.push({ heading: `Section ${index + 1}`, content: [pageText || ""] })
      } else {
        let currentHeading = `Section ${index + 1}`
        let currentContent: string[] = []

        for (const line of lines) {
          const looksLikeHeading = /^#{1,6}\s+/.test(line) || (line.length < 80 && /^[A-Z][A-Za-z0-9\s,&()/-]+$/.test(line))
          if (looksLikeHeading && currentContent.length > 0) {
            sections.push({ heading: currentHeading, content: currentContent })
            currentHeading = getHeadingFromText(line, currentHeading)
            currentContent = []
          } else if (looksLikeHeading && currentContent.length === 0) {
            currentHeading = getHeadingFromText(line, currentHeading)
          } else {
            currentContent.push(line)
          }
        }

        if (currentContent.length > 0) {
          sections.push({ heading: currentHeading, content: currentContent })
        }

        if (sections.length === 0) {
          sections.push({ heading: `Section ${index + 1}`, content: lines })
        }
      }

      return {
        pageNumber: index + 1,
        sections,
      }
    })

  const chunks = chunkStructuredPages(pages)
  const extractedText = chunks.map((chunk) => chunk.content).join("\n\n")

  return {
    title,
    pages,
    chunks,
    extractedText,
    metadata: {
      pages: options?.pages || pages.length,
      language: "en",
      processedAt: new Date().toISOString(),
      extractionMode: options?.extractionMode || "text-normalized",
      scanned: options?.scanned || false,
      confidence: options?.confidence ?? 1,
      warnings: options?.warnings || [],
    },
  }
}

// ---------------------------------------------------------------------------
// Legacy: Page-by-page extraction (backward compatible with old PdfPageData)
// ---------------------------------------------------------------------------

interface LegacyPdfPageData {
  pageNumber: number
  text: string
}

/**
 * Build a StructuredDocument from page-by-page extracted text (legacy format).
 * Kept for backward compatibility. Prefer createStructuredDocumentFromExtraction.
 */
export function createStructuredDocumentFromPages(
  pageData: LegacyPdfPageData[],
  title: string,
  options?: {
    extractionMode?: string
    scanned?: boolean
    confidence?: number
    warnings?: string[]
  },
): StructuredDocument {
  const pages: StructuredPage[] = pageData.map((pd) => {
    const lines = pd.text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)

    const sections: StructuredSection[] = lines.length > 0
      ? [{ heading: `Page ${pd.pageNumber}`, content: lines }]
      : [{ heading: `Page ${pd.pageNumber}`, content: [""] }]

    return { pageNumber: pd.pageNumber, sections }
  })

  const chunks: StructuredChunk[] = pages.map((page) => {
    const content = page.sections.map((s) => [s.heading, ...s.content].join("\n")).join("\n\n")
    return {
      chunkId: `chunk-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      pageNumbers: [page.pageNumber],
      heading: `Page ${page.pageNumber}`,
      content,
      wordCount: countWords(content),
    }
  })

  const extractedText = chunks.map((c) => c.content).join("\n\n")

  return {
    title,
    pages,
    chunks,
    extractedText,
    metadata: {
      pages: pages.length,
      language: "en",
      processedAt: new Date().toISOString(),
      extractionMode: options?.extractionMode || "pdfjs-page",
      scanned: options?.scanned ?? false,
      confidence: options?.confidence ?? 0.9,
      warnings: options?.warnings || [],
    },
  }
}

export function chunkStructuredPages(
  pages: StructuredPage[],
  _options?: unknown,
): StructuredChunk[] {
  return pages.map((page) => {
    const content = page.sections.map((section) => section.content.join("\n")).join("\n\n").trim()
    return {
      chunkId: `page-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      pageNumbers: [page.pageNumber],
      heading: page.sections[0]?.heading || `Page ${page.pageNumber}`,
      content,
      wordCount: countWords(content),
    }
  })
}

export function combineChunksToText(chunks: Array<{ content: string }>): string {
  return chunks.map((chunk) => chunk.content).join("\n\n")
}

export function buildLegacyDocumentStructure(
  text: string,
  originalFileName: string,
  options?: { sourceType?: string },
): StructuredDocument {
  return createStructuredDocumentFromText(text, originalFileName, {
    extractionMode: options?.sourceType || "legacy-text",
    scanned: false,
    confidence: 0.75,
  })
}
