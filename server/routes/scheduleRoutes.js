const express = require("express")
const scheduleController = require("../controllers/scheduleController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/generate", authMiddleware, scheduleController.generateSchedule)
router.get("/", authMiddleware, scheduleController.getSchedules)
router.get("/:id", authMiddleware, scheduleController.getSchedule)

module.exports = router
