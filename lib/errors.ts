export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "APIError"
  }
}

/**
 * Enhanced error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, message)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, details)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", details?: any) {
    super(500, message, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(502, message, details)
  }
}

/**
 * Error handler for API routes
 */
export function handleError(error: unknown): {
  statusCode: number
  message: string
  details?: any
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    console.error("Unhandled error:", error)
    return {
      statusCode: 500,
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    }
  }

  return {
    statusCode: 500,
    message: "An unknown error occurred",
  }
}

export const errorMessages = {
  UNAUTHORIZED: "Unauthorized. Please log in.",
  INVALID_TOKEN: "Invalid or expired token.",
  USER_EXISTS: "User already exists with this email.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  DOCUMENT_NOT_FOUND: "Document not found.",
  FILE_REQUIRED: "File is required.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload PDF, TXT, or DOCX.",
  FILE_TOO_LARGE: "File is too large. Maximum size is 30MB.",
  INTERNAL_ERROR: "Internal server error.",
}
