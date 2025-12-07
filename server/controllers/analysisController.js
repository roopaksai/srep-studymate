const AnalysisReport = require("../models/AnalysisReport")
const Document = require("../models/Document")

// Generate analysis report
exports.generateAnalysis = async (req, res) => {
  try {
    const { answerScriptDocumentId } = req.body

    if (!answerScriptDocumentId) {
      return res.status(400).json({ message: "Answer script document ID is required" })
    }

    const document = await Document.findOne({ _id: answerScriptDocumentId, userId: req.userId })
    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    // Mock analysis generation
    const report = new AnalysisReport({
      userId: req.userId,
      answerScriptDocumentId,
      summary:
        "Your answer script shows a good understanding of the core concepts. Areas of improvement identified in detailed breakdown.",
      strengths: ["Clear conceptual understanding", "Well-structured answers", "Good use of examples"],
      weaknesses: ["Lack of diagrams/visuals", "Some spelling errors", "Time management issues"],
      recommendedTopics: ["Advanced Applications", "Edge Cases and Exceptions", "Practical Implementation"],
    })

    await report.save()
    res.status(201).json(report)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get all analysis reports for user
exports.getAnalysisReports = async (req, res) => {
  try {
    const reports = await AnalysisReport.find({ userId: req.userId }).sort({ createdAt: -1 })
    res.json(reports)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}

// Get single analysis report
exports.getAnalysisReport = async (req, res) => {
  try {
    const report = await AnalysisReport.findOne({ _id: req.params.id, userId: req.userId })
    if (!report) {
      return res.status(404).json({ message: "Analysis report not found" })
    }
    res.json(report)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
