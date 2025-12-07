import mongoose from "mongoose"

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["study-material", "answer-script"],
      default: "study-material",
    },
  },
  { timestamps: true },
)

export default mongoose.models.Document || mongoose.model("Document", documentSchema)
