const mongoose = require("mongoose")

const scheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate: Date,
    endDate: Date,
    slots: [
      {
        date: Date,
        topic: String,
        durationMinutes: Number,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Schedule", scheduleSchema)
