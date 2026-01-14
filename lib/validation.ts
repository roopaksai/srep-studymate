/**
 * Input Validation Schemas using Zod
 * Type-safe validation for all API inputs
 */

import { z } from 'zod'

// User validation
export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export const userSignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

// Document validation
export const documentUploadSchema = z.object({
  type: z.enum(['study-material', 'answer-script']),
})

export const documentIdSchema = z.object({
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
})

// Flashcard validation
export const generateFlashcardsSchema = z.object({
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
})

// Mock paper validation
export const generateMockPaperSchema = z.object({
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
  questionCount: z.number().min(1).max(50).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
})

export const submitQuizSchema = z.object({
  mockPaperId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid mock paper ID'),
  answers: z.array(z.object({
    questionIndex: z.number().min(0),
    answer: z.string().max(5000),
  })),
})

// Schedule validation
export const generateScheduleSchema = z.object({
  topics: z.array(z.string().max(200)).min(1).max(20),
  studyHoursPerDay: z.number().min(1).max(12),
  totalDays: z.number().min(1).max(365),
})

// Analysis validation
export const generateAnalysisSchema = z.object({
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
  mockPaperId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid mock paper ID').optional(),
})

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// File validation
export const fileValidation = {
  maxSize: 30 * 1024 * 1024, // 30MB
  allowedTypes: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.txt', '.doc', '.docx'],
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > fileValidation.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${fileValidation.maxSize / (1024 * 1024)}MB`,
    }
  }

  // Check file type
  if (!fileValidation.allowedTypes.includes(file.type)) {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!fileValidation.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: 'Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed',
      }
    }
  }

  // Check filename
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Filename too long (max 255 characters)',
    }
  }

  return { valid: true }
}

/**
 * Generic validation wrapper
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const validated = await schema.parseAsync(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
      return { success: false, errors }
    }
    return { success: false, errors: ['Validation failed'] }
  }
}

/**
 * Sanitize MongoDB query to prevent injection
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query === 'string') {
    return query
  }

  if (Array.isArray(query)) {
    return query.map(sanitizeMongoQuery)
  }

  if (typeof query === 'object' && query !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(query)) {
      // Block MongoDB operators in top-level keys
      if (key.startsWith('$') || key.startsWith('_')) {
        continue
      }
      sanitized[key] = sanitizeMongoQuery(value)
    }
    return sanitized
  }

  return query
}

/**
 * Validate ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Rate limit configurations by endpoint
 */
export const endpointRateLimits = {
  // Authentication - very strict
  '/api/auth/login': { limit: 5, windowMs: 15 * 60 * 1000 },
  '/api/auth/signup': { limit: 3, windowMs: 60 * 60 * 1000 },
  
  // Upload - moderate
  '/api/documents/upload': { limit: 20, windowMs: 60 * 60 * 1000 },
  '/api/documents/upload-chunk': { limit: 100, windowMs: 60 * 60 * 1000 },
  
  // AI generation - moderate to prevent abuse
  '/api/flashcards/generate': { limit: 10, windowMs: 60 * 60 * 1000 },
  '/api/mock-papers/generate': { limit: 10, windowMs: 60 * 60 * 1000 },
  '/api/analysis/generate': { limit: 10, windowMs: 60 * 60 * 1000 },
  '/api/schedule/generate': { limit: 15, windowMs: 60 * 60 * 1000 },
  
  // Read operations - generous
  '/api/documents': { limit: 100, windowMs: 15 * 60 * 1000 },
  '/api/flashcards': { limit: 100, windowMs: 15 * 60 * 1000 },
  '/api/mock-papers': { limit: 100, windowMs: 15 * 60 * 1000 },
  
  // Default
  default: { limit: 50, windowMs: 15 * 60 * 1000 },
}
