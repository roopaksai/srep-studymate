import mongoose from "mongoose"

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    topics: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ["study-material", "answer-script"],
      default: "study-material",
      index: true,
    },
  },
  { timestamps: true },
)

// Compound indexes for common queries
documentSchema.index({ userId: 1, type: 1 })
documentSchema.index({ userId: 1, createdAt: -1 })
documentSchema.index({ createdAt: -1 })

export default mongoose.models.Document || mongoose.model("Document", documentSchema)
