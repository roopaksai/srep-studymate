const express = require("express")
const mockPaperController = require("../controllers/mockPaperController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/generate", authMiddleware, mockPaperController.generateMockPaper)
router.get("/", authMiddleware, mockPaperController.getMockPapers)
router.get("/:id", authMiddleware, mockPaperController.getMockPaper)

module.exports = router
