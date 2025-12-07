const MockPaper = require("../models/MockPaper")
const Document = require("../models/Document")

// Generate mock paper
exports.generateMockPaper = async (req, res) => {
  try {
    const { documentId, title } = req.body

    if (!documentId || !title) {
      return res.status(400).json({ message: "Document ID and title are required" })
    }

    const document = await Document.findOne({ _id: documentId, userId: req.userId })
    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    // Mock question generation
    const questions = [
      { text: "Explain the main concept from the document", marks: 10 },
      { text: "What are the key takeaways?", marks: 8 },
      { text: "Provide an example based on the content", marks: 7 },
      { text: "What are the applications?", marks: 10 },
      { text: "Define the core principles", marks: 5 },
    ]

    const mockPaper = new MockPaper({
      userId: req.userId,
      documentId,
      title,
      questions,
    })

    await mockPaper.save()
    res.status(201).json(mockPaper)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get all mock papers for user
exports.getMockPapers = async (req, res) => {
  try {
    const papers = await MockPaper.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(papers)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get single mock paper
exports.getMockPaper = async (req, res) => {
  try {
    const paper = await MockPaper.findOne({ _id: req.params.id, userId: req.userId })
    if (!paper) {
      return res.status(404).json({ message: "Mock paper not found" })
    }
    res.json(paper)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
