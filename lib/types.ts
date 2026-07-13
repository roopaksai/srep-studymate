export interface User {
  id: string
  email: string
  name: string
}

export interface DocumentPageSection {
  heading: string
  content: string[]
}

export interface DocumentPage {
  pageNumber: number
  sections: DocumentPageSection[]
}

export interface DocumentChunk {
  chunkId: string
  pageNumber: number
  pageNumbers?: number[]
  heading?: string
  content: string
  wordCount: number
}

export interface DocumentMetadata {
  pages?: number
  language?: string
  processedAt?: string
  extractionMode?: string
  scanned?: boolean
  scannedPages?: number
  confidence?: number
  warnings?: string[]
  totalChars?: number
  extractionTimeMs?: number
}

export interface Document {
  _id: string
  userId: string
  originalFileName: string
  fileHash?: string
  title?: string
  sourceType?: "pdf" | "docx" | "doc" | "txt"
  type: "study-material" | "answer-script"
  processingStatus: "pending" | "processing" | "completed" | "failed"
  processingError?: string | null
  topics?: string[]
  pages?: DocumentPage[]
  chunks?: DocumentChunk[]
  metadata?: DocumentMetadata
  extractedText?: string
  createdAt: string
}

export interface DocumentJob {
  jobId: string
  documentId: string
  resultId?: string
  status: "processing" | "done" | "failed"
  progress?: number
  stage?: string
  error?: string | null
}

export interface Flashcard {
  question: string
  answer: string
}

export interface FlashcardSet {
  id: string
  userId: string
  documentId: string
  title: string
  cards: Flashcard[]
  createdAt: string
}

export interface Question {
  text: string
  marks: number
}

export interface MockPaper {
  id: string
  userId: string
  documentId: string
  title: string
  questions: Question[]
  totalMarks?: number
  createdAt: string
}

export interface AnalysisReport {
  id: string
  userId: string
  answerScriptDocumentId: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
  createdAt: string
}

export interface ScheduleSlot {
  date: string
  topic: string
  durationMinutes: number
}

export interface Schedule {
  id: string
  userId: string
  startDate: string
  endDate: string
  slots: ScheduleSlot[]
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface APIError {
  error: string
  status: number
}
