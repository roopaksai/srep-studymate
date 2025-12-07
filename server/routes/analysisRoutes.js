const express = require("express")
const analysisController = require("../controllers/analysisController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/generate", authMiddleware, analysisController.generateAnalysis)
router.get("/", authMiddleware, analysisController.getAnalysisReports)
router.get("/:id", authMiddleware, analysisController.getAnalysisReport)

module.exports = router
