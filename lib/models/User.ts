import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)

// Soft delete: Exclude deleted users by default
userSchema.pre(/^find/, function() {
  // @ts-ignore
  this.where({ deletedAt: null })
})

// Indexes for better query performance
userSchema.index({ email: 1 })
userSchema.index({ createdAt: -1 })

export default mongoose.models.User || mongoose.model("User", userSchema)
