import mongoose from "mongoose"

const mockPaperSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    paperType: {
      type: String,
      enum: ['mcq', 'descriptive'],
      required: true,
      index: true,
    },
    questions: [
      {
        text: String,
        marks: Number,
        type: {
          type: String,
          enum: ['mcq', 'descriptive', 'short-answer'],
          default: 'descriptive',
        },
        options: [String], // For MCQ questions
        correctAnswer: String, // For MCQ questions
      },
    ],
    // For MCQ papers - store user's quiz attempt
    userAnswers: [
      {
        questionIndex: Number,
        selectedAnswer: String,
        skipped: Boolean,
      },
    ],
    quizCompleted: {
      type: Boolean,
      default: false,
    },
    // For descriptive papers - link to uploaded answer script
    answerScriptDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    // Link to generated analysis report
    analysisReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnalysisReport",
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)

// Soft delete: Exclude deleted mock papers by default
mockPaperSchema.pre(/^find/, function() {
  // @ts-ignore
  this.where({ deletedAt: null })
})

// Compound indexes for common queries
mockPaperSchema.index({ userId: 1, documentId: 1, paperType: 1 })
mockPaperSchema.index({ userId: 1, createdAt: -1 })
mockPaperSchema.index({ documentId: 1, paperType: 1 })

export default mongoose.models.MockPaper || mongoose.model("MockPaper", mockPaperSchema)
