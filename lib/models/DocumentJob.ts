import mongoose from "mongoose"

const documentJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    fileHash: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["processing", "done", "failed"],
      default: "processing",
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    stage: {
      type: String,
      default: "queued",
    },
    resultId: {
      type: String,
      default: null,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ["pdf", "docx", "doc", "txt"],
      default: "pdf",
      index: true,
    },
  },
  { timestamps: true },
)

documentJobSchema.index({ userId: 1, createdAt: -1 })
documentJobSchema.index({ userId: 1, fileHash: 1 })

export default mongoose.models.DocumentJob || mongoose.model("DocumentJob", documentJobSchema, "jobs")