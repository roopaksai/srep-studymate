import mongoose from "mongoose"

const mockPaperSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    questions: [
      {
        text: String,
        marks: Number,
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.models.MockPaper || mongoose.model("MockPaper", mockPaperSchema)
