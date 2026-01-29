import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Process text for AI with intelligent chunking and token estimation
 * Intelligently chunks large texts while preserving context
 */
export function prepareTextForAI(text: string, maxLength: number = 12000): string {
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
