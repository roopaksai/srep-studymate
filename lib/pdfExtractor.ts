import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import "pdfjs-dist/legacy/build/pdf.worker.mjs"

export interface PdfPageData {
  pageNumber: number
  text: string
}

export interface PdfExtractResult {
  text: string
  pageCount: number
  pages: PdfPageData[]
}

function toBuffer(input: Buffer | ArrayBuffer): Buffer {
  return input instanceof Buffer ? input : Buffer.from(input)
}

/**
 * Extract text from a PDF buffer using pdfjs-dist (page-by-page, pure Node.js/Vercel compatible).
 */
export async function extractPdfText(input: Buffer | ArrayBuffer): Promise<PdfExtractResult> {
  const buffer = toBuffer(input)
  const uint8Array = new Uint8Array(buffer)

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const pages: PdfPageData[] = []
  let fullText = ""

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items
      .map((item: any) => item.str)
      .filter((str: string) => str.trim() !== "")
    const text = strings.join(" ")
    pages.push({ pageNumber: i, text })
    fullText += text + "\n\n"
  }

  return {
    text: fullText.trim(),
    pageCount,
    pages,
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
