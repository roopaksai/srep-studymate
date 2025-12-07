const express = require("express")
const flashcardController = require("../controllers/flashcardController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/generate", authMiddleware, flashcardController.generateFlashcards)
router.get("/", authMiddleware, flashcardController.getFlashcards)
router.get("/:id", authMiddleware, flashcardController.getFlashcard)

module.exports = router
