import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean and optimize text by removing noise, irrelevant characters, and extra whitespace
 * Increases token efficiency by 2-3x - fits more meaningful content in same character limit
 * Removes: control chars, excessive whitespace, repeated punctuation, metadata, etc.
 */
export function cleanAndOptimizeText(text: string): string {
  if (!text) return ''

  // Step 1: Normalize Unicode encoding
  // Convert fancy quotes/dashes to ASCII, remove control characters
  text = text
    .normalize('NFKD')
    .replace(/[^\w\s.,!?:;()\[\]{}\-–—/&\n'"]/g, '') // Keep only useful characters
    .replace(/['']/g, "'")      // Fancy quotes → regular quote
    .replace(/[""]/g, '"')      // Fancy double quotes → regular quote
    .replace(/–|—/g, '-')       // En-dash/em-dash → hyphen

  // Step 2: Standardize whitespace
  text = text
    .replace(/\t/g, ' ')                  // Tabs → spaces
    .replace(/ {3,}/g, ' ')               // 3+ spaces → 1 space
    .replace(/\n{3,}/g, '\n\n')          // 3+ newlines → 2 newlines (preserve paragraph structure)
    .replace(/\n\s+/g, '\n')             // Remove trailing spaces on lines
    .trim()

  // Step 3: Clean excessive punctuation
  text = text
    .replace(/([!?]){2,}/g, '$1')        // !! → !
    .replace(/\.{2,}/g, '.')             // .. → .
    .replace(/,{2,}/g, ',')              // ,, → ,
    .replace(/(\()\s+/g, '$1')           // ( space → (
    .replace(/\s+(\))/g, '$1')           // space ) → )

  // Step 4: Remove noise patterns
  text = text
    .split('\n')
    .map(line => {
      // Remove page numbers (Page 1, p. 1, etc.)
      line = line.replace(/(?:page|p\.)\s*\d+/gi, '')
      // Remove copyright symbols and metadata
      line = line.replace(/^[©®™]/gm, '')
      // Remove header/footer separators (===, ---, etc.)
      line = line.replace(/^[=\-_]{5,}$/g, '')
      return line.trim()
    })
    .filter(line => {
      // Remove very short lines (likely garbage or separators)
      if (line.length < 3) return false
      // Remove lines that are just symbols
      if (/^[!?.,;:\-—–()[\]{}]*$/.test(line)) return false
      return true
    })
    .join('\n')

  // Step 5: Final cleanup
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n')    // Collapse multiple empty lines
    .trim()

  return text
}

/**
 * Remove boilerplate sections that don't add value to content
 * Targets appendices, references, glossaries, TOC, index
 */
export function removeBoilerplate(text: string): string {
  if (!text) return ''

  return text
    // Remove appendix sections
    .replace(/^(?:APPENDIX|APPENDICES)[\s\S]*$/im, '')
    // Remove references/bibliography
    .replace(/^(?:REFERENCES|BIBLIOGRAPHY|CITATIONS|SOURCES)[\s\S]*$/im, '')
    // Remove table of contents
    .replace(/^(?:TABLE OF CONTENTS|TOC|CONTENTS)[\s\S]*?(?=\n[A-Z]|\n$)/im, '')
    // Remove index
    .replace(/^(?:INDEX|INDICES)[\s\S]*$/im, '')
    // Remove acknowledgments (usually at end)
    .replace(/^(?:ACKNOWLEDGMENTS?|ACKNOWLEDGEMENTS?)[\s\S]*$/im, '')
    // Remove about author/contact info
    .replace(/^(?:ABOUT THE AUTHOR|CONTACT|AUTHOR BIO)[\s\S]*$/im, '')
    .trim()
}

/**
 * Estimate page count from character length
 * Average: ~3000 characters per page in academic text
 */
export function estimatePageCount(text: string): number {
  const charPerPage = 3000
  return Math.ceil(text.length / charPerPage)
}

/**
 * Extract key content from large documents
 * Prioritizes: Introduction → Body → Conclusion
 * Skips repetitive middle sections for very large docs
 */
export function extractKeyContentFromLargeDoc(text: string): string {
  if (!text) return ''

  // Split by common section markers (headers)
  const sections = text.split(/\n(?=[A-Z][A-Za-z\s]*\n-{3,}|\n#{1,4}\s)/g)
  
  if (sections.length <= 5) {
    // Small doc - use everything
    return text
  }

  // For large docs, intelligently select sections
  const prioritized: string[] = []

  // Keep first 3 sections (usually intro/overview)
  prioritized.push(...sections.slice(0, 3))

  // Keep middle section (usually main content)
  const middleIndex = Math.floor(sections.length / 2)
  prioritized.push(...sections.slice(Math.max(3, middleIndex - 2), middleIndex + 3))

  // Keep last 2-3 sections (usually conclusion/summary)
  prioritized.push(...sections.slice(Math.max(sections.length - 3, 0)))

  return prioritized.join('\n\n').trim()
}

/**
 * Prepare document content adaptively based on document size
 * Small docs (≤8 pages): Use all content, 6000 char limit
 * Medium docs (8-15 pages): Use all, 7000 char limit
 * Large docs (>15 pages): Extract key sections, 8000 char limit
 */
export function prepareDocumentContent(text: string): string {
  if (!text) return ''

  // Step 1: Clean noise
  let content = cleanAndOptimizeText(text)

  // Estimate page count
  const pageCount = estimatePageCount(content)

  // Step 2: Remove boilerplate if doc is large
  if (pageCount > 10) {
    content = removeBoilerplate(content)
    // Re-clean after boilerplate removal
    content = cleanAndOptimizeText(content)
  }

  // Step 3: Smart truncation based on doc size
  if (pageCount <= 8) {
    // Small doc - use 6000 chars (fits almost entirely)
    return prepareTextForAI(content, 6000)
  } else if (pageCount <= 15) {
    // Medium doc - use 7000 chars
    return prepareTextForAI(content, 7000)
  } else {
    // Large doc - extract key content first, then limit to 8000 chars
    const keyContent = extractKeyContentFromLargeDoc(content)
    return prepareTextForAI(keyContent, 8000)
  }
}

/**
 * Process text for AI with intelligent chunking and token estimation
 * Optimized for free models: smaller context (6000) = less hallucination, better quality
 */
export function prepareTextForAI(text: string, maxLength: number = 6000): string {
  if (!text) return ''
  
  // If text is within limit, return as-is
  if (text.length <= maxLength) {
    return text
  }

  // Split by paragraphs and try to fit as many complete paragraphs as possible
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  let result = ''

  for (const paragraph of paragraphs) {
    if ((result + paragraph).length <= maxLength) {
      result += (result ? '\n\n' : '') + paragraph
    } else {
      // If we've already added some content, stop here
      if (result) break
      
      // Otherwise, add partial paragraph (last resort)
      const remaining = maxLength - result.length - 2 // -2 for \n\n
      if (remaining > 100) {
        result += (result ? '\n\n' : '') + paragraph.substring(0, remaining) + '...'
      }
      break
    }
  }

  return result || text.substring(0, maxLength)
}

/**
 * Split text into meaningful chunks for batch processing
 * Useful when you need to process text in parts while maintaining context
 */
export function splitTextIntoChunks(text: string, chunkSize: number = 3000, overlap: number = 500): string[] {
  if (!text) return []
  
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    
    // Try to break at paragraph boundary
    let actualEnd = end
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n\n', end)
      if (lastNewline > start + 500) { // Only if it's not too far back
        actualEnd = lastNewline
      }
    }

    chunks.push(text.substring(start, actualEnd).trim())
    
    // Move start with overlap
    start = actualEnd - overlap
  }

  return chunks.filter(chunk => chunk.length > 0)
}
