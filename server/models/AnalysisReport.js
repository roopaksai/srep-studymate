const mongoose = require("mongoose")

const analysisReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answerScriptDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    summary: String,
    strengths: [String],
    weaknesses: [String],
    recommendedTopics: [String],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model("AnalysisReport", analysisReportSchema)
