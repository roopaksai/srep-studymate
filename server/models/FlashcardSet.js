const mongoose = require("mongoose")

const flashcardSetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    title: String,
    cards: [
      {
        question: String,
        answer: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model("FlashcardSet", flashcardSetSchema)
