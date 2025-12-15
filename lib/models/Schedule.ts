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
  },
  { timestamps: true },
)

export default mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema)
