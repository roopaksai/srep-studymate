const FlashcardSet = require("../models/FlashcardSet")
const Document = require("../models/Document")

// Generate flashcards
exports.generateFlashcards = async (req, res) => {
  try {
    const { documentId, title } = req.body

    if (!documentId || !title) {
      return res.status(400).json({ message: "Document ID and title are required" })
    }

    const document = await Document.findOne({ _id: documentId, userId: req.userId })
    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    // Mock flashcard generation - split text into sentences and create Q/A pairs
    const sentences = document.extractedText.split(".").filter((s) => s.trim())
    const cards = sentences.slice(0, 5).map((sentence, idx) => ({
      question: `What is point ${idx + 1} from the document?`,
      answer: sentence.trim(),
    }))

    const flashcardSet = new FlashcardSet({
      userId: req.userId,
      documentId,
      title,
      cards,
    })

    await flashcardSet.save()
    res.status(201).json(flashcardSet)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get all flashcard sets for user
exports.getFlashcards = async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(sets)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get single flashcard set
exports.getFlashcard = async (req, res) => {
  try {
    const set = await FlashcardSet.findOne({ _id: req.params.id, userId: req.userId })
    if (!set) {
      return res.status(404).json({ message: "Flashcard set not found" })
    }
    res.json(set)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
