const mongoose = require("mongoose")

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalFileName: String,
    filePath: String,
    extractedText: String,
    type: { type: String, enum: ["study-material", "answer-script"], default: "study-material" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Document", documentSchema)
