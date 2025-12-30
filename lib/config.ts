/**
 * Centralized configuration for the application
 * All environment-based settings should be defined here
 */

export const config = {
  // AI Configuration
  ai: {
    model: process.env.AI_MODEL || "openai/gpt-3.5-turbo",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    maxRetries: 3,
    timeout: 30000, // 30 seconds
    temperature: 0.7,
    maxTokens: 2000,
  },

  // File Upload Configuration
  files: {
    maxSize: 30 * 1024 * 1024, // 30MB
    allowedTypes: [".pdf", ".docx", ".doc", ".txt"],
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ],
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || "",
    options: {
      retryWrites: true,
      w: "majority",
    },
  },

  // Authentication Configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: "7d",
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    version: "v1",
  },

  // Cache Configuration
  cache: {
    ttl: 3600, // 1 hour in seconds
    aiResponseTTL: 86400, // 24 hours for AI responses
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // requests per window
  },

  // Text Processing
  text: {
    maxStorageLength: 5000, // Max chars to store in DB
    maxContextLength: 4000, // Max chars to send to AI
    topicExtractionLength: 3000, // Max chars for topic extraction
  },

  // Mock Paper Configuration
  mockPaper: {
    mcqQuestionCount: 10,
    descriptiveQuestionCount: 10,
    mcqMarksPerQuestion: 4,
    descriptiveMarksPerQuestion: 10,
  },

  // Grading Scale
  grading: {
    "A+": { min: 90, max: 100 },
    A: { min: 80, max: 89 },
    "B+": { min: 70, max: 79 },
    B: { min: 60, max: 69 },
    C: { min: 50, max: 59 },
    D: { min: 40, max: 49 },
    F: { min: 0, max: 39 },
  },

  // Feature Flags
  features: {
    aiGeneration: true,
    scheduler: true,
    flashcards: true,
    analysis: true,
    topicIdentification: true,
  },

  // Application Metadata
  app: {
    name: "SREP StudyMate",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
  },
}

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const required = [
    { key: "OPENROUTER_API_KEY", value: config.ai.apiKey },
    { key: "MONGODB_URI", value: config.database.uri },
    { key: "JWT_SECRET", value: config.auth.jwtSecret },
  ]

  const missing = required.filter((item) => !item.value)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((m) => m.key).join(", ")}`
    )
  }
}

/**
 * Get grade based on percentage
 */
export function getGrade(percentage: number): string {
  for (const [grade, range] of Object.entries(config.grading)) {
    if (percentage >= range.min && percentage <= range.max) {
      return grade
    }
  }
  return "F"
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature]
}
