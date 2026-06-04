import mongoose from "mongoose"

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileHash: {
      type: String,
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    sourceType: {
      type: String,
      enum: ["pdf", "docx", "doc", "txt"],
      default: "pdf",
      index: true,
    },
    pages: {
      type: [
        {
          pageNumber: Number,
          sections: [
            {
              heading: String,
              content: [String],
            },
          ],
        },
      ],
      default: [],
    },
    chunks: {
      type: [
        {
          chunkId: String,
          pageNumber: Number,
          pageNumbers: [Number],
          heading: String,
          content: String,
          wordCount: Number,
        },
      ],
      default: [],
    },
    metadata: {
      pages: { type: Number, default: 0 },
      language: { type: String, default: "en" },
      processedAt: { type: Date, default: null },
      extractionMode: { type: String, default: "" },
      scanned: { type: Boolean, default: false },
      confidence: { type: Number, default: 1 },
      warnings: { type: [String], default: [] },
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
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    processingError: {
      type: String,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)

// Soft delete: Exclude deleted documents by default
documentSchema.pre(/^find/, function() {
  // @ts-ignore
  this.where({ deletedAt: null })
})

// Compound indexes for common queries
documentSchema.index(
  { userId: 1, fileHash: 1 },
  { unique: true, partialFilterExpression: { fileHash: { $type: "string" } } },
)
documentSchema.index({ userId: 1, type: 1 })
documentSchema.index({ userId: 1, createdAt: -1 })
documentSchema.index({ createdAt: -1 })

export default mongoose.models.Document || mongoose.model("Document", documentSchema)
