const express = require("express")
const multer = require("multer")
const documentController = require("../controllers/documentController")
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post("/upload", authMiddleware, upload.single("file"), documentController.uploadDocument)
router.get("/", authMiddleware, documentController.getDocuments)
router.get("/:id", authMiddleware, documentController.getDocument)

module.exports = router
