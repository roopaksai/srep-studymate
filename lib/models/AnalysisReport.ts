import mongoose from "mongoose"

const analysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answerScriptDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    summary: {
      type: String,
      default: "",
    },
    strengths: [String],
    weaknesses: [String],
    recommendedTopics: [String],
  },
  { timestamps: true },
)

export default mongoose.models.AnalysisReport || mongoose.model("AnalysisReport", analysisReportSchema)
