import mongoose from "mongoose"

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    slots: [
      {
        date: Date,
        topic: String,
        durationMinutes: Number,
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema)
