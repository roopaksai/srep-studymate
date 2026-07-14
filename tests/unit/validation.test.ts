import { describe, it, expect } from "vitest"
import {
  userLoginSchema,
  userSignupSchema,
  documentUploadSchema,
  generateFlashcardsSchema,
  generateMockPaperSchema,
  submitQuizSchema,
  generateScheduleSchema,
  validateRequest,
  validateFile,
  isValidObjectId,
  paginationSchema,
} from "@/lib/validation"

describe("validation", () => {
  describe("validateRequest", () => {
    it("returns success with valid data", async () => {
      const result = await validateRequest(userLoginSchema, {
        email: "test@example.com",
        password: "password123",
      })
      expect(result.success).toBe(true)
    })

    it("returns errors with invalid data", async () => {
      const result = await validateRequest(userLoginSchema, {
        email: "not-an-email",
        password: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe("userLoginSchema", () => {
    it("validates correct login", () => {
      const result = userLoginSchema.safeParse({
        email: "user@test.com",
        password: "password123",
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid email", () => {
      const result = userLoginSchema.safeParse({
        email: "invalid",
        password: "password123",
      })
      expect(result.success).toBe(false)
    })

    it("rejects short password", () => {
      const result = userLoginSchema.safeParse({
        email: "user@test.com",
        password: "123",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("userSignupSchema", () => {
    it("validates correct signup", () => {
      const result = userSignupSchema.safeParse({
        name: "Test User",
        email: "user@test.com",
        password: "Password1",
      })
      expect(result.success).toBe(true)
    })

    it("requires uppercase letter", () => {
      const result = userSignupSchema.safeParse({
        name: "Test User",
        email: "user@test.com",
        password: "password1",
      })
      expect(result.success).toBe(false)
    })

    it("requires lowercase letter", () => {
      const result = userSignupSchema.safeParse({
        name: "Test User",
        email: "user@test.com",
        password: "PASSWORD1",
      })
      expect(result.success).toBe(false)
    })

    it("requires number", () => {
      const result = userSignupSchema.safeParse({
        name: "Test User",
        email: "user@test.com",
        password: "Password",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("documentUploadSchema", () => {
    it("validates study-material type", () => {
      const result = documentUploadSchema.safeParse({ type: "study-material" })
      expect(result.success).toBe(true)
    })

    it("validates answer-script type", () => {
      const result = documentUploadSchema.safeParse({ type: "answer-script" })
      expect(result.success).toBe(true)
    })

    it("rejects invalid type", () => {
      const result = documentUploadSchema.safeParse({ type: "invalid" })
      expect(result.success).toBe(false)
    })
  })

  describe("generateFlashcardsSchema", () => {
    it("validates correct documentId", () => {
      const result = generateFlashcardsSchema.safeParse({
        documentId: "507f1f77bcf86cd799439011",
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid documentId format", () => {
      const result = generateFlashcardsSchema.safeParse({
        documentId: "not-a-valid-id",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("generateMockPaperSchema", () => {
    it("validates with required fields only", () => {
      const result = generateMockPaperSchema.safeParse({
        documentId: "507f1f77bcf86cd799439011",
      })
      expect(result.success).toBe(true)
    })

    it("validates with optional fields", () => {
      const result = generateMockPaperSchema.safeParse({
        documentId: "507f1f77bcf86cd799439011",
        questionCount: 10,
        difficulty: "medium",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("submitQuizSchema", () => {
    it("validates correct submission", () => {
      const result = submitQuizSchema.safeParse({
        mockPaperId: "507f1f77bcf86cd799439011",
        answers: [
          { questionIndex: 0, answer: "A" },
          { questionIndex: 1, answer: "B" },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("generateScheduleSchema", () => {
    it("validates correct schedule input", () => {
      const result = generateScheduleSchema.safeParse({
        topics: ["Math", "Physics"],
        studyHoursPerDay: 4,
        totalDays: 14,
      })
      expect(result.success).toBe(true)
    })

    it("rejects empty topics", () => {
      const result = generateScheduleSchema.safeParse({
        topics: [],
        studyHoursPerDay: 4,
        totalDays: 14,
      })
      expect(result.success).toBe(false)
    })

    it("rejects hours > 12", () => {
      const result = generateScheduleSchema.safeParse({
        topics: ["Math"],
        studyHoursPerDay: 15,
        totalDays: 7,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("validateFile", () => {
    it("accepts valid PDF file", () => {
      const file = new File(["content"], "test.pdf", { type: "application/pdf" })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it("accepts valid TXT file", () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it("rejects oversized file", () => {
      const bigContent = new ArrayBuffer(11 * 1024 * 1024) // 11MB
      const file = new File([bigContent], "big.pdf", { type: "application/pdf" })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("File too large")
    })

    it("rejects wrong file type", () => {
      const file = new File(["content"], "test.exe", { type: "application/x-executable" })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("Invalid file type")
    })

    it("rejects long filename", () => {
      const longName = "a".repeat(256) + ".pdf"
      const file = new File(["content"], longName, { type: "application/pdf" })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("Filename too long")
    })
  })

  describe("isValidObjectId", () => {
    it("validates 24-char hex string", () => {
      expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true)
    })

    it("validates uppercase hex", () => {
      expect(isValidObjectId("507F1F77BCF86CD799439011")).toBe(true)
    })

    it("rejects too short", () => {
      expect(isValidObjectId("abc123")).toBe(false)
    })

    it("rejects non-hex characters", () => {
      expect(isValidObjectId("507f1f77bcf86cd79943901g")).toBe(false)
    })
  })

  describe("paginationSchema", () => {
    it("validates with valid page and limit", () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 20 })
      expect(result.success).toBe(true)
    })

    it("validates with no params (optional)", () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it("rejects page < 1", () => {
      const result = paginationSchema.safeParse({ page: 0 })
      expect(result.success).toBe(false)
    })
  })
})
