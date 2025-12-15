import mongoose from "mongoose"

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "Study Schedule",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    studyHoursPerDay: {
      type: Number,
      default: 3,
    },
    restDays: {
      type: [Number], // 0 = Sunday, 1 = Monday, etc.
      default: [],
    },
    slots: [
      {
        date: Date,
        topic: String,
        durationMinutes: Number,
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "medium",
        },
        completed: {
          type: Boolean,
          default: false,
        },
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

// Soft delete: Exclude deleted schedules by default
scheduleSchema.pre(/^find/, function() {
  // @ts-ignore
  this.where({ deletedAt: null })
})

// Compound indexes for optimized queries
scheduleSchema.index({ userId: 1, createdAt: -1 })
scheduleSchema.index({ userId: 1, startDate: 1 })

export default mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema)
