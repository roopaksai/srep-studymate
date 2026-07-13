/**
 * Centralized configuration for the application
 * All environment-based settings should be defined here
 */

export const config = {
  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || "openrouter",
    apiKey: process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || "",
    apiUrl: process.env.AI_API_URL || "https://openrouter.ai/api/v1",
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 2000,
    maxRetries: 3,

    // Per-feature model selection (all free on OpenRouter)
    // Quality-ranked: gemma-4-31b (65) > nemotron-3-super-120b (60) > gpt-oss-120b (55) > gemma-4-26b (52) > llama-3.3-70b (24)
    models: {
      // High-quality structured JSON generation (flashcards, questions)
      flashcards: process.env.AI_MODEL_FLASHCARDS || "google/gemma-4-31b-it:free",
      mockQuestions: process.env.AI_MODEL_MOCK_QUESTIONS || "nvidia/nemotron-3-super-120b-a12b:free",
      // Reasoning-heavy tasks (analysis, assessment)
      analysis: process.env.AI_MODEL_ANALYSIS || "openai/gpt-oss-120b:free",
      // Planning tasks (schedule generation)
      schedule: process.env.AI_MODEL_SCHEDULE || "google/gemma-4-26b-a4b-it:free",
      // Lightweight tasks (topic identification, simple extraction)
      topicIdentification: process.env.AI_MODEL_TOPICS || "meta-llama/llama-3.3-70b-instruct:free",
      // Default fallback chain — tried in order on rate limit / failure
      default: process.env.AI_MODEL || "google/gemma-4-31b-it:free",
      fallbackChain: [
        process.env.AI_MODEL || "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-oss-120b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
      ],
    },
  },

  // File Upload Configuration
  files: {
    maxSize: 10 * 1024 * 1024, // 10MB
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

  // Document processing
  processing: {
    maxPages: 100,
    maxFileSize: 30 * 1024 * 1024, // 30MB
    chunkTargetWords: 400,
    chunkMinWords: 300,
    chunkMaxWords: 500,
  },

  // Deterministic generation defaults
  generation: {
    temperature: 0,
    flashcardTargetCount: 12,
    mcqTargetCount: 10,
    descriptiveTargetCount: 10,
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
    { key: "AI_API_KEY or OPENROUTER_API_KEY", value: config.ai.apiKey },
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
