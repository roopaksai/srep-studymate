import mongoose from "mongoose"

const analysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    answerScriptDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Analysis Report",
    },
    summary: {
      type: String,
      default: "",
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    questionScores: [
      {
        questionNumber: Number,
        questionText: String,
        scoredMarks: Number,
        maxMarks: Number,
        feedback: String,
      },
    ],
    strengths: [String],
    weaknesses: [String],
    recommendedTopics: [String],
    grade: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
)

// Compound indexes for common queries
analysisReportSchema.index({ userId: 1, createdAt: -1 })
analysisReportSchema.index({ answerScriptDocumentId: 1 })
analysisReportSchema.index({ grade: 1 })

export default mongoose.models.AnalysisReport || mongoose.model("AnalysisReport", analysisReportSchema)
