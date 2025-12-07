export interface User {
  id: string
  email: string
  name: string
}

export interface Document {
  _id: string
  userId: string
  originalFileName: string
  extractedText: string
  type: "study-material" | "answer-script"
  createdAt: string
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
