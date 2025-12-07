export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "APIError"
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
  FILE_TOO_LARGE: "File is too large. Maximum size is 5MB.",
  INTERNAL_ERROR: "Internal server error.",
}
