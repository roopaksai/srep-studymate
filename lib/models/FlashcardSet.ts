import mongoose from "mongoose"

const flashcardSetSchema = new mongoose.Schema(
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
    cards: [
      {
        question: String,
        answer: String,
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.models.FlashcardSet || mongoose.model("FlashcardSet", flashcardSetSchema)
