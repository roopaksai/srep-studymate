import { z } from 'zod'

// Auth Validation Schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  name: z.string().min(1, 'Name is required').max(100),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

// Document Validation Schemas
export const uploadDocumentSchema = z.object({
  type: z.enum(['study-material', 'answer-script']).default('study-material'),
})

export const documentFileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max(10 * 1024 * 1024, 'File size must not exceed 30MB'),
  type: z.string().refine(
    (type) => [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(type),
    'File must be PDF, DOCX, or TXT'
  ),
})

// Flashcard Validation Schemas
export const generateFlashcardSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  reattempt: z.boolean().optional().default(false),
})

// Mock Paper Validation Schemas
export const generateMockPaperSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  questionType: z.enum(['mcq', 'descriptive', 'mixed']).default('mixed'),
  reattempt: z.boolean().optional().default(false),
})

export const submitQuizSchema = z.object({
  paperId: z.string().min(1, 'Paper ID is required'),
  answers: z.array(z.object({
    questionIndex: z.number().int().nonnegative(),
    selectedAnswer: z.string().optional(),
    skipped: z.boolean().optional().default(false),
  })).min(1, 'At least one answer is required'),
})

// Analysis Validation Schemas
export const generateAnalysisSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
})

// Schedule Validation Schemas
export const generateScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  topics: z.array(z.string().min(1).max(200)).min(1, 'At least one topic is required').max(50, 'Maximum 50 topics'),
  studyHoursPerDay: z.number().int().min(1).max(12).default(3),
  restDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  useAI: z.boolean().optional().default(true),
})

// Helper function to validate request body
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; errors: z.ZodError } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: firstError.message,
        errors: error,
      }
    }
    return {
      success: false,
      error: 'Validation failed',
      errors: error as z.ZodError,
    }
  }
}

// Type exports for TypeScript
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>
export type GenerateFlashcardInput = z.infer<typeof generateFlashcardSchema>
export type GenerateMockPaperInput = z.infer<typeof generateMockPaperSchema>
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>
export type GenerateAnalysisInput = z.infer<typeof generateAnalysisSchema>
export type GenerateScheduleInput = z.infer<typeof generateScheduleSchema>
