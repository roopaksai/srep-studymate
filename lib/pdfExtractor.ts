import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import "pdfjs-dist/legacy/build/pdf.worker.mjs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  hasEOL: boolean
}

export interface TextLine {
  items: TextItem[]
  y: number
  x: number
  width: number
}

export interface TextBlock {
  type: "heading" | "paragraph" | "list" | "code" | "separator"
  level?: number
  content: string
}

export interface TableData {
  rows: string[][]
  columns: number
}

export interface PageResult {
  pageNumber: number
  markdown: string
  blocks: TextBlock[]
  tables: TableData[]
  isScanned: boolean
  ocrConfidence?: number
  warnings: string[]
}

export interface ExtractionResult {
  title: string
  fullMarkdown: string
  tocMarkdown: string
  pages: PageResult[]
  chunks: StructuredChunk[]
  extractedText: string
  metadata: {
    pageCount: number
    scannedPages: number
    totalChars: number
    warnings: string[]
    extractionTimeMs: number
  }
}

interface StructuredChunk {
  chunkId: string
  pageNumber: number
  pageNumbers: number[]
  heading: string
  content: string
  wordCount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBuffer(input: Buffer | ArrayBuffer): Buffer {
  return input instanceof Buffer ? input : Buffer.from(input)
}

function countWords(text: string): number {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return 0
  return normalized.split(" ").length
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_`])/g, "\\$1")
}

// ---------------------------------------------------------------------------
// Step 1: Load PDF and extract raw text items with positional data
// ---------------------------------------------------------------------------

async function extractPageItems(page: any): Promise<TextItem[]> {
  const content = await page.getTextContent()
  const items: TextItem[] = []

  for (const item of content.items) {
    if (!item.str || item.str.trim() === "") continue

    // item.transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const tx = item.transform
    const x = tx[4]
    const y = tx[5]
    const fontSize = Math.abs(tx[3]) // scaleY component ≈ font size
    const width = item.width ?? 0
    const height = item.height ?? 0

    items.push({
      str: item.str,
      x,
      y,
      width,
      height,
      fontSize,
      fontName: item.fontName || "",
      hasEOL: item.hasEOL || false,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Step 2: Classify page as text-based or scanned
// ---------------------------------------------------------------------------

function classifyPage(items: TextItem[], pageWidth: number, pageHeight: number): "text" | "scanned" {
  if (items.length === 0) return "scanned"

  // Calculate total character count across all items
  const totalChars = items.reduce((sum, item) => sum + item.str.length, 0)

  // Calculate page area coverage
  const pageArea = pageWidth * pageHeight
  let textArea = 0
  for (const item of items) {
    textArea += item.width * item.height
  }

  const coverageRatio = textArea / pageArea
  const charsPerPage = totalChars / 1 // single page

  // A page with < 50 characters of text or < 0.1% area coverage is likely scanned
  if (charsPerPage < 50 && coverageRatio < 0.001) return "scanned"

  // Also check if most items have very few characters (garbled extraction = scanned PDF)
  const avgCharsPerItem = totalChars / items.length
  if (avgCharsPerItem < 2 && items.length > 5) return "scanned"

  return "text"
}

// ---------------------------------------------------------------------------
// Step 3: OCR via tesseract.js (only for scanned pages)
// ---------------------------------------------------------------------------

async function ocrPage(
  page: any,
  viewport: any,
): Promise<{ text: string; confidence: number }> {
  // Render page to canvas-like bitmap
  const canvas = {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    style: { width: "", height: "" },
    getContext: () => null,
  }

  // Use pdfjs-dist to render to a buffer we can pass to tesseract
  // We render at 2x for better OCR quality
  const scale = 2
  const scaledViewport = page.getViewport({ scale })

  // Create an off-screen canvas via node-canvas or use the raw image data
  // For serverless, we'll use pdfjs-dist's built-in rendering to get image data
  const renderTask = page.render({
    canvasContext: createOffscreenCanvas(scaledViewport.width, scaledViewport.height),
    viewport: scaledViewport,
  })

  await renderTask.promise

  // Convert canvas to image data
  const polyfill = await importCanvasPolyfill()
  const offscreen = polyfill.createCanvas(scaledViewport.width, scaledViewport.height)
  const ctx = offscreen.getContext("2d")
  if (!ctx) {
    return { text: "", confidence: 0 }
  }

  // Run tesseract.js OCR
  const Tesseract = await import("tesseract.js")
  const result = await Tesseract.recognize(offscreen.toBuffer("image/png"), "eng", {
    logger: () => {},
  })

  return {
    text: result.data.text,
    confidence: result.data.confidence / 100, // Normalize to 0-1
  }
}

// Canvas polyfill for serverless environments
let canvasPolyfill: {
  createCanvas: (w: number, h: number) => any
  getImageData: (x: number, y: number, w: number, h: number) => any
} | null = null

async function importCanvasPolyfill() {
  if (canvasPolyfill) return canvasPolyfill
  try {
    // @ts-expect-error @napi-rs/canvas is optional — fallback handles its absence
    const canvas = await import("@napi-rs/canvas")
    canvasPolyfill = {
      createCanvas: (w: number, h: number) => canvas.createCanvas(w, h),
      getImageData: (_x: number, _y: number, _w: number, _h: number) => null,
    }
  } catch {
    canvasPolyfill = {
      createCanvas: (_w: number, _h: number) => ({
        getContext: () => null,
        toBuffer: () => Buffer.alloc(0),
      }),
      getImageData: (_x: number, _y: number, _w: number, _h: number) => null,
    }
  }
  return canvasPolyfill
}

function createOffscreenCanvas(w: number, h: number): any {
  // Return a minimal object that pdfjs-dist render() expects
  return {
    width: w,
    height: h,
    style: {},
    getContext: () => ({
      drawImage: () => {},
      putImageData: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(w * h * 4) }),
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
    }),
  }
}

// ---------------------------------------------------------------------------
// Step 4: Layout analysis - group items into lines and detect columns
// ---------------------------------------------------------------------------

function groupIntoLines(items: TextItem[]): TextLine[] {
  if (items.length === 0) return []

  // Sort by Y position descending (PDF Y is from bottom, we want top-to-bottom)
  const sorted = [...items].sort((a, b) => b.y - a.y)

  const lines: TextLine[] = []
  let currentLine: TextItem[] = [sorted[0]]
  let currentY = sorted[0].y

  // Threshold for "same line": half of average font size
  const avgFontSize = items.reduce((s, i) => s + i.fontSize, 0) / items.length
  const lineThreshold = avgFontSize * 0.6

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    if (Math.abs(item.y - currentY) < lineThreshold) {
      currentLine.push(item)
    } else {
      // Sort current line by X position (left to right)
      currentLine.sort((a, b) => a.x - b.x)
      lines.push({
        items: currentLine,
        y: currentY,
        x: currentLine[0].x,
        width: currentLine[currentLine.length - 1].x + currentLine[currentLine.length - 1].width - currentLine[0].x,
      })
      currentLine = [item]
      currentY = item.y
    }
  }

  // Push last line
  currentLine.sort((a, b) => a.x - b.x)
  lines.push({
    items: currentLine,
    y: currentY,
    x: currentLine[0].x,
    width: currentLine[currentLine.length - 1].x + currentLine[currentLine.length - 1].width - currentLine[0].x,
  })

  return lines
}

function detectColumns(lines: TextLine[]): TextLine[][] {
  if (lines.length === 0) return []

  // Collect all line X positions
  const xPositions = lines.map((l) => l.x)

  // Cluster X positions using simple threshold-based grouping
  const sorted = [...new Set(xPositions)].sort((a, b) => a - b)
  const clusters: number[][] = []
  let currentCluster = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < 80) {
      // 80px threshold for same column
      currentCluster.push(sorted[i])
    } else {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
    }
  }
  clusters.push(currentCluster)

  if (clusters.length <= 1) {
    return [lines] // Single column
  }

  // Multi-column: group lines by their column cluster
  const columnGroups: TextLine[][] = clusters.map(() => [] as TextLine[])

  for (const line of lines) {
    let minDist = Infinity
    let bestColumn = 0
    for (let c = 0; c < clusters.length; c++) {
      const avgX = clusters[c].reduce((s, x) => s + x, 0) / clusters[c].length
      const dist = Math.abs(line.x - avgX)
      if (dist < minDist) {
        minDist = dist
        bestColumn = c
      }
    }
    columnGroups[bestColumn].push(line)
  }

  // Sort each column's lines by Y position (top to bottom)
  for (const group of columnGroups) {
    group.sort((a, b) => b.y - a.y) // PDF Y is inverted
  }

  return columnGroups
}

// ---------------------------------------------------------------------------
// Step 5: Structure detection - headings, tables, lists, code
// ---------------------------------------------------------------------------

function detectStructure(
  lines: TextLine[],
  allItems: TextItem[],
): { blocks: TextBlock[]; tables: TableData[] } {
  if (lines.length === 0) return { blocks: [], tables: [] }

  // Calculate font size statistics
  const fontSizes = allItems.map((i) => i.fontSize).filter((s) => s > 0)
  const medianFontSize = [...fontSizes].sort((a, b) => a - b)[Math.floor(fontSizes.length / 2)] || 12
  const avgFontSize = fontSizes.reduce((s, v) => s + v, 0) / fontSizes.length || 12

  const blocks: TextBlock[] = []
  const tables: TableData[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const lineText = line.items.map((item) => item.str).join(" ").trim()

    // Skip empty lines
    if (!lineText) {
      i++
      continue
    }

    // --- Table detection ---
    // Check if next few lines form a grid pattern (consistent X positions across lines)
    const tableCandidate = tryExtractTable(lines, i, medianFontSize)
    if (tableCandidate) {
      tables.push(tableCandidate.table)
      blocks.push({
        type: "paragraph",
        content: formatTableAsMarkdown(tableCandidate.table),
      })
      i = tableCandidate.nextLineIndex
      continue
    }

    // --- Heading detection ---
    const avgItemFontSize = line.items.length > 0
      ? line.items.reduce((s, item) => s + item.fontSize, 0) / line.items.length
      : avgFontSize

    const relativeSize = avgItemFontSize / medianFontSize
    const isBoldFont = line.items.some(
      (item) => /bold|heavy|black|semibold/i.test(item.fontName),
    )
    const isAllCaps = lineText === lineText.toUpperCase() && lineText.length > 2 && /[A-Z]/.test(lineText)

    let headingLevel: number | null = null

    if (relativeSize > 1.8 || (relativeSize > 1.5 && isBoldFont)) {
      headingLevel = 1
    } else if (relativeSize > 1.4 || (relativeSize > 1.2 && isBoldFont)) {
      headingLevel = 2
    } else if (relativeSize > 1.2 || (relativeSize > 1.1 && isBoldFont)) {
      headingLevel = 3
    } else if (isAllCaps && lineText.length < 80 && line.items.length <= 3) {
      // ALL CAPS short line = likely a heading
      headingLevel = 2
    }

    // Also detect markdown-style headings
    const mdHeadingMatch = lineText.match(/^(#{1,6})\s+(.+)/)
    if (mdHeadingMatch) {
      headingLevel = mdHeadingMatch[1].length
    }

    if (headingLevel !== null) {
      const cleanText = lineText.replace(/^#{1,6}\s+/, "").trim()
      blocks.push({
        type: "heading",
        level: Math.min(headingLevel, 6),
        content: cleanText,
      })
      i++
      continue
    }

    // --- List detection ---
    const listMatch = lineText.match(/^([•\-\*►▸▹➤]|(\d+[\.\)]))\s+(.+)/)
    if (listMatch) {
      const listItems: string[] = [listMatch[3] || listMatch[0]]
      const listType = /^\d/.test(lineText) ? "ordered" : "unordered"

      // Collect consecutive list items
      let j = i + 1
      while (j < lines.length) {
        const nextText = lines[j].items.map((item) => item.str).join(" ").trim()
        const nextMatch = nextText.match(/^([•\-\*►▸▹➤]|(\d+[\.\)]))\s+(.+)/)
        if (nextMatch) {
          listItems.push(nextMatch[3] || nextMatch[0])
          j++
        } else if (nextText === "") {
          j++ // skip empty lines within a list
        } else {
          break
        }
      }

      const prefix = listType === "ordered" ? (idx: number) => `${idx + 1}. ` : () => "- "
      const content = listItems.map((item, idx) => `${prefix(idx)}${item}`).join("\n")
      blocks.push({ type: "list", content })
      i = j
      continue
    }

    // --- Code block detection ---
    const monospaceItems = line.items.filter((item) =>
      /mono|courier|consol|fixed|code/i.test(item.fontName),
    )
    const isCodeLine =
      monospaceItems.length > line.items.length * 0.7 ||
      (lineText.startsWith("  ") && lineText.includes("=")) ||
      /^\s*(function|const|let|var|import|export|class|if|for|while|return)\s/.test(lineText)

    if (isCodeLine) {
      const codeLines: string[] = [lineText]
      let j = i + 1
      while (j < lines.length) {
        const nextText = lines[j].items.map((item) => item.str).join(" ").trim()
        const nextIsMono = lines[j].items.filter((item) =>
          /mono|courier|consol|fixed|code/i.test(item.fontName),
        ).length > lines[j].items.length * 0.7
        if (nextIsMono || nextText === "") {
          codeLines.push(nextText)
          j++
        } else {
          break
        }
      }
      blocks.push({
        type: "code",
        content: "```\n" + codeLines.join("\n") + "\n```",
      })
      i = j
      continue
    }

    // --- Separator detection ---
    if (/^[\-_=]{5,}$/.test(lineText)) {
      blocks.push({ type: "separator", content: "---" })
      i++
      continue
    }

    // --- Paragraph (default) ---
    // Merge consecutive paragraph lines
    const paragraphLines: string[] = [lineText]
    let j = i + 1
    while (j < lines.length) {
      const nextLine = lines[j]
      const nextText = nextLine.items.map((item) => item.str).join(" ").trim()

      if (!nextText) {
        j++
        break
      }

      // Check if next line is a new structure element
      const nextIsHeading = isLikelyHeading(nextLine, medianFontSize, avgFontSize)
      const nextIsList = /^[•\-\*►▸▹➤]|^\d+[\.\)]/.test(nextText)
      const nextIsCode = /mono|courier|consol|fixed|code/i.test(
        nextLine.items[0]?.fontName || "",
      )
      const nextIsTable = tryExtractTable(lines, j, medianFontSize)

      if (nextIsHeading || nextIsList || nextIsCode || nextIsTable) break

      // Check vertical gap - if too large, it's a new paragraph
      const gap = Math.abs(i === j - 1 ? lines[j].y - lines[j - 1].y : 0)
      if (gap > medianFontSize * 2.5) break

      paragraphLines.push(nextText)
      j++
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" "),
    })
    i = j
  }

  return { blocks, tables }
}

function isLikelyHeading(line: TextLine, medianFontSize: number, avgFontSize: number): boolean {
  const avgItemSize = line.items.length > 0
    ? line.items.reduce((s, item) => s + item.fontSize, 0) / line.items.length
    : avgFontSize
  const text = line.items.map((item) => item.str).join(" ").trim()
  const isBold = line.items.some((item) => /bold|heavy|black|semibold/i.test(item.fontName))
  const isAllCaps = text === text.toUpperCase() && text.length > 2 && /[A-Z]/.test(text)

  return (
    avgItemSize / medianFontSize > 1.2 ||
    (isBold && text.length < 80) ||
    (isAllCaps && text.length < 80 && line.items.length <= 3)
  )
}

// ---------------------------------------------------------------------------
// Step 6: Table extraction
// ---------------------------------------------------------------------------

function tryExtractTable(
  lines: TextLine[],
  startIndex: number,
  medianFontSize: number,
): { table: TableData; nextLineIndex: number } | null {
  // Need at least 2 rows with multiple items each
  if (startIndex + 1 >= lines.length) return null

  const firstLine = lines[startIndex]
  const secondLine = lines[startIndex + 1]

  // Both lines need multiple items (cells)
  if (firstLine.items.length < 2 || secondLine.items.length < 2) return null

  // Check if items in both lines have similar X positions (column alignment)
  const firstLineXs = firstLine.items.map((i) => Math.round(i.x / 10) * 10)
  const secondLineXs = secondLine.items.map((i) => Math.round(i.x / 10) * 10)

  // Count overlapping X positions
  let overlaps = 0
  for (const x of firstLineXs) {
    if (secondLineXs.includes(x)) overlaps++
  }

  // If > 50% of columns align, it's likely a table
  const alignment = overlaps / Math.max(firstLineXs.length, secondLineXs.length)
  if (alignment < 0.4) return null

  // Collect all table rows
  const rows: string[][] = []
  let endIndex = startIndex

  for (let j = startIndex; j < Math.min(startIndex + 30, lines.length); j++) {
    const line = lines[j]
    const lineText = line.items.map((item) => item.str).join(" ").trim()

    // Skip separator lines (---, ===)
    if (/^[\-_=]{3,}$/.test(lineText)) {
      endIndex = j + 1
      continue
    }

    if (line.items.length >= 2) {
      const cells = line.items.map((item) => item.str.trim()).filter(Boolean)
      if (cells.length >= 2) {
        rows.push(cells)
        endIndex = j + 1
      }
    } else {
      break
    }
  }

  if (rows.length < 2) return null

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length))
  const normalizedRows = rows.map((r) => {
    while (r.length < maxCols) r.push("")
    return r.slice(0, maxCols)
  })

  return {
    table: { rows: normalizedRows, columns: maxCols },
    nextLineIndex: endIndex,
  }
}

function formatTableAsMarkdown(table: TableData): string {
  if (table.rows.length === 0) return ""

  const header = table.rows[0]
  const separator = header.map(() => "---")
  const body = table.rows.slice(1)

  const lines = [
    "| " + header.join(" | ") + " |",
    "| " + separator.join(" | ") + " |",
    ...body.map((row) => "| " + row.join(" | ") + " |"),
  ]

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Step 7: Convert blocks to markdown
// ---------------------------------------------------------------------------

function blocksToMarkdown(blocks: TextBlock[]): string {
  const lines: string[] = []

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        lines.push("")
        lines.push(`${"#".repeat(block.level || 2)} ${block.content}`)
        lines.push("")
        break
      case "paragraph":
        lines.push("")
        lines.push(block.content)
        lines.push("")
        break
      case "list":
        lines.push("")
        lines.push(block.content)
        lines.push("")
        break
      case "code":
        lines.push("")
        lines.push(block.content)
        lines.push("")
        break
      case "separator":
        lines.push("")
        lines.push("---")
        lines.push("")
        break
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

// ---------------------------------------------------------------------------
// Step 8: Generate Table of Contents
// ---------------------------------------------------------------------------

function generateTOC(pages: PageResult[]): string {
  const tocEntries: { text: string; level: number; page: number }[] = []

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type === "heading") {
        tocEntries.push({
          text: block.content,
          level: block.level || 2,
          page: page.pageNumber,
        })
      }
    }
  }

  if (tocEntries.length === 0) return ""

  const lines = ["## Table of Contents", ""]

  for (const entry of tocEntries) {
    const indent = "  ".repeat(entry.level - 1)
    const anchor = entry.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    lines.push(`${indent}- [${entry.text}](#${anchor}) ... Page ${entry.page}`)
  }

  lines.push("")
  lines.push("---")
  lines.push("")

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Step 9: Build chunks for AI processing
// ---------------------------------------------------------------------------

function buildChunks(pages: PageResult[]): StructuredChunk[] {
  const chunks: StructuredChunk[] = []

  for (const page of pages) {
    if (!page.markdown || page.markdown.trim().length === 0) continue

    // Find the first heading on the page for the chunk heading
    const firstHeading = page.blocks.find((b) => b.type === "heading")
    const heading = firstHeading ? firstHeading.content : `Page ${page.pageNumber}`

    const content = page.markdown.trim()
    const wordCount = countWords(content)

    chunks.push({
      chunkId: `chunk-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      pageNumbers: [page.pageNumber],
      heading,
      content,
      wordCount,
    })
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

export async function extractPdf(
  input: Buffer | ArrayBuffer,
  title?: string,
  onProgress?: (stage: string, progress: number) => void,
): Promise<ExtractionResult> {
  const startTime = Date.now()
  const buffer = toBuffer(input)
  const uint8Array = new Uint8Array(buffer)
  const warnings: string[] = []

  onProgress?.("Loading PDF", 0)

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const pages: PageResult[] = []
  let scannedPages = 0
  let totalChars = 0

  onProgress?.("Extracting text", 10)

  for (let i = 1; i <= pageCount; i++) {
    const progress = 10 + Math.round((i / pageCount) * 70)
    onProgress?.(`Processing page ${i}/${pageCount}`, progress)

    try {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.0 })
      const items = await extractPageItems(page)

      // Classify page
      const classification = classifyPage(items, viewport.width, viewport.height)
      let pageItems = items
      let isScanned = false
      let ocrConfidence: number | undefined

      if (classification === "scanned") {
        isScanned = true
        scannedPages++
        try {
          onProgress?.(`OCR page ${i}/${pageCount}`, progress)
          const ocrResult = await ocrPage(page, viewport)
          ocrConfidence = ocrResult.confidence

          if (ocrResult.text.trim().length > 0) {
            // Convert OCR text to TextItems for layout analysis
            const ocrLines = ocrResult.text.split("\n")
            pageItems = ocrLines.flatMap((line, lineIdx) => {
              if (!line.trim()) return []
              return [{
                str: line,
                x: 72, // Standard margin
                y: viewport.height - 72 - lineIdx * 14,
                width: line.length * 7,
                height: 14,
                fontSize: 12,
                fontName: "unknown",
                hasEOL: true,
              }]
            })

            if (ocrConfidence < 0.5) {
              warnings.push(`Page ${i}: Low OCR confidence (${Math.round(ocrConfidence * 100)}%). Text may be inaccurate.`)
            }
          } else {
            warnings.push(`Page ${i}: OCR returned no text. Page may be blank or unreadable.`)
          }
        } catch (ocrError) {
          warnings.push(`Page ${i}: OCR failed - ${ocrError instanceof Error ? ocrError.message : "Unknown error"}`)
        }
      }

      totalChars += pageItems.reduce((sum, item) => sum + item.str.length, 0)

      // Layout analysis
      const lines = groupIntoLines(pageItems)
      const columnGroups = detectColumns(lines)

      // Process columns in reading order (left to right)
      const allLines: TextLine[] = []
      for (const columnLines of columnGroups) {
        allLines.push(...columnLines)
      }

      // Re-sort all lines by Y position (top to bottom) for final reading order
      allLines.sort((a, b) => b.y - a.y)

      // Structure detection
      const { blocks, tables } = detectStructure(allLines, pageItems)

      // Generate markdown for this page
      const pageMarkdown = blocksToMarkdown(blocks)

      pages.push({
        pageNumber: i,
        markdown: pageMarkdown,
        blocks,
        tables,
        isScanned,
        ocrConfidence,
        warnings: [],
      })
    } catch (pageError) {
      warnings.push(`Page ${i}: Failed to process - ${pageError instanceof Error ? pageError.message : "Unknown error"}`)
      pages.push({
        pageNumber: i,
        markdown: "",
        blocks: [],
        tables: [],
        isScanned: false,
        warnings: [`Failed to process page ${i}`],
      })
    }
  }

  onProgress?.("Generating document", 85)

  // Generate TOC
  const tocMarkdown = generateTOC(pages)

  // Assemble full markdown
  const docTitle = title || "Document"
  const pageSections = pages
    .filter((p) => p.markdown.trim().length > 0)
    .map((p) => `<!-- Page ${p.pageNumber} -->\n\n${p.markdown}`)

  const fullMarkdown = `# ${docTitle}\n\n${tocMarkdown}${pageSections.join("\n\n")}`

  // Build chunks
  const chunks = buildChunks(pages)

  onProgress?.("Complete", 100)

  const extractionTimeMs = Date.now() - startTime

  return {
    title: docTitle,
    fullMarkdown,
    tocMarkdown,
    pages,
    chunks,
    extractedText: fullMarkdown,
    metadata: {
      pageCount,
      scannedPages,
      totalChars,
      warnings,
      extractionTimeMs,
    },
  }
}

// ---------------------------------------------------------------------------
// Legacy API: extractPdfText (backward compatible)
// ---------------------------------------------------------------------------

export interface PdfPageData {
  pageNumber: number
  text: string
}

export interface PdfExtractResult {
  text: string
  pageCount: number
  pages: PdfPageData[]
}

/**
 * Legacy extraction API for backward compatibility.
 * Uses the new extraction pipeline but returns the old format.
 */
export async function extractPdfText(input: Buffer | ArrayBuffer): Promise<PdfExtractResult> {
  const result = await extractPdf(input)

  return {
    text: result.extractedText,
    pageCount: result.metadata.pageCount,
    pages: result.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.markdown,
    })),
  }
}

export async function getPdfPageCount(input: Buffer | ArrayBuffer): Promise<number> {
  const buffer = toBuffer(input)
  const uint8Array = new Uint8Array(buffer)

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdf = await loadingTask.promise
  return pdf.numPages
}
