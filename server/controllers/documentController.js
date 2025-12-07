const Document = require("../models/Document")
const fs = require("fs")
const path = require("path")

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const { type } = req.body

    if (!req.file) {
      return res.status(400).json({ message: "No file provided" })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../uploads")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Mock text extraction - in real app, use pdf-parse or other libraries
    let extractedText = ""
    if (req.file.mimetype === "text/plain") {
      extractedText = req.file.buffer.toString("utf-8")
    } else {
      extractedText = `Sample extracted content from ${req.file.originalname}. This is placeholder text for now.`
    }

    const document = new Document({
      userId: req.userId,
      originalFileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      extractedText,
      type: type || "study-material",
    })

    await document.save()
    res.status(201).json(document)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get all documents for user
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(documents)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.userId })
    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }
    res.json(document)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
