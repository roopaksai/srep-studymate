const mongoose = require("mongoose")

const mockPaperSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    title: String,
    questions: [
      {
        text: String,
        marks: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model("MockPaper", mockPaperSchema)
