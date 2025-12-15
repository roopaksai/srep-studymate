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
    topic: {
      type: String,
      default: "",
    },
    cards: [
      {
        question: String,
        answer: String,
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)

// Soft delete: Exclude deleted flashcard sets by default
flashcardSetSchema.pre(/^find/, function() {
  // @ts-ignore
  this.where({ deletedAt: null })
})

// Compound indexes for optimized queries
flashcardSetSchema.index({ userId: 1, documentId: 1 })
flashcardSetSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.FlashcardSet || mongoose.model("FlashcardSet", flashcardSetSchema)
