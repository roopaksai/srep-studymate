import { describe, it, expect } from "vitest"
import {
  AppError,
  APIError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  ExternalServiceError,
  handleError,
  errorMessages,
} from "@/lib/errors"

describe("errors", () => {
  describe("AppError", () => {
    it("has correct statusCode, message, and details", () => {
      const err = new AppError(400, "Bad request", { field: "name" })
      expect(err.statusCode).toBe(400)
      expect(err.message).toBe("Bad request")
      expect(err.details).toEqual({ field: "name" })
      expect(err.name).toBe("AppError")
    })

    it("has optional details", () => {
      const err = new AppError(500, "Server error")
      expect(err.details).toBeUndefined()
    })
  })

  describe("ValidationError", () => {
    it("has statusCode 400", () => {
      const err = new ValidationError("Invalid input")
      expect(err.statusCode).toBe(400)
      expect(err.message).toBe("Invalid input")
      expect(err.name).toBe("ValidationError")
    })
  })

  describe("UnauthorizedError", () => {
    it("has statusCode 401", () => {
      const err = new UnauthorizedError()
      expect(err.statusCode).toBe(401)
      expect(err.message).toBe("Unauthorized")
    })

    it("accepts custom message", () => {
      const err = new UnauthorizedError("Token expired")
      expect(err.message).toBe("Token expired")
    })
  })

  describe("NotFoundError", () => {
    it("has statusCode 404", () => {
      const err = new NotFoundError()
      expect(err.statusCode).toBe(404)
      expect(err.message).toBe("Resource not found")
    })
  })

  describe("ConflictError", () => {
    it("has statusCode 409", () => {
      const err = new ConflictError("Already exists")
      expect(err.statusCode).toBe(409)
      expect(err.message).toBe("Already exists")
    })
  })

  describe("InternalServerError", () => {
    it("has statusCode 500", () => {
      const err = new InternalServerError()
      expect(err.statusCode).toBe(500)
      expect(err.message).toBe("Internal server error")
    })
  })

  describe("ExternalServiceError", () => {
    it("has statusCode 502", () => {
      const err = new ExternalServiceError("Service down")
      expect(err.statusCode).toBe(502)
      expect(err.message).toBe("Service down")
      expect(err.name).toBe("ExternalServiceError")
    })
  })

  describe("APIError", () => {
    it("has correct status and message", () => {
      const err = new APIError(403, "Forbidden")
      expect(err.status).toBe(403)
      expect(err.message).toBe("Forbidden")
      expect(err.name).toBe("APIError")
    })
  })

  describe("handleError", () => {
    it("returns correct shape for AppError", () => {
      const err = new ValidationError("Bad input", { field: "x" })
      const result = handleError(err)
      expect(result.statusCode).toBe(400)
      expect(result.message).toBe("Bad input")
      expect(result.details).toEqual({ field: "x" })
    })

    it("returns 500 + message for generic Error", () => {
      const err = new Error("Something broke")
      const result = handleError(err)
      expect(result.statusCode).toBe(500)
      expect(result.message).toBe("Internal server error")
    })

    it("returns 500 for unknown input", () => {
      const result = handleError("string error")
      expect(result.statusCode).toBe(500)
      expect(result.message).toBe("An unknown error occurred")
    })

    it("returns 500 for null", () => {
      const result = handleError(null)
      expect(result.statusCode).toBe(500)
      expect(result.message).toBe("An unknown error occurred")
    })
  })

  describe("errorMessages", () => {
    it("defines all required constants", () => {
      expect(errorMessages.UNAUTHORIZED).toBeDefined()
      expect(errorMessages.INVALID_TOKEN).toBeDefined()
      expect(errorMessages.USER_EXISTS).toBeDefined()
      expect(errorMessages.INVALID_CREDENTIALS).toBeDefined()
      expect(errorMessages.DOCUMENT_NOT_FOUND).toBeDefined()
      expect(errorMessages.FILE_REQUIRED).toBeDefined()
      expect(errorMessages.INVALID_FILE_TYPE).toBeDefined()
      expect(errorMessages.FILE_TOO_LARGE).toBeDefined()
      expect(errorMessages.INTERNAL_ERROR).toBeDefined()
    })
  })
})
