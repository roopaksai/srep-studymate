const Schedule = require("../models/Schedule")

// Generate schedule
exports.generateSchedule = async (req, res) => {
  try {
    const { startDate, endDate, topics } = req.body

    if (!startDate || !endDate || !topics || topics.length === 0) {
      return res.status(400).json({ message: "Start date, end date, and topics are required" })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

    // Distribute topics across days round-robin
    const slots = []
    let topicIndex = 0

    for (let i = 0; i < dayCount; i++) {
      const slotDate = new Date(start)
      slotDate.setDate(slotDate.getDate() + i)

      slots.push({
        date: slotDate,
        topic: topics[topicIndex % topics.length],
        durationMinutes: 60,
      })

      topicIndex++
    }

    const schedule = new Schedule({
      userId: req.userId,
      startDate: start,
      endDate: end,
      slots,
    })

    await schedule.save()
    res.status(201).json(schedule)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get all schedules for user
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(schedules)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get single schedule
exports.getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.userId })
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" })
    }
    res.json(schedule)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
